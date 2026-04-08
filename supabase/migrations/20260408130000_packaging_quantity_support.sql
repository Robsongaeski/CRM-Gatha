-- Suporte a compras por volume (ex.: 2 volumes de 1000 unidades)
-- Mantém custo médio por unidade final e também registra dados de volume.

alter table public.purchase_items
  add column if not exists purchase_quantity numeric(14,4),
  add column if not exists purchase_unit text,
  add column if not exists units_per_purchase numeric(14,4) not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_items_units_per_purchase_check'
      and conrelid = 'public.purchase_items'::regclass
  ) then
    alter table public.purchase_items
      add constraint purchase_items_units_per_purchase_check check (units_per_purchase > 0);
  end if;
end $$;

update public.purchase_items
set
  purchase_quantity = coalesce(purchase_quantity, quantity),
  purchase_unit = coalesce(nullif(purchase_unit, ''), unit),
  units_per_purchase = coalesce(nullif(units_per_purchase, 0), 1)
where
  purchase_quantity is null
  or purchase_unit is null
  or purchase_unit = ''
  or units_per_purchase is null
  or units_per_purchase = 0;

create or replace function public.procurement_set_purchase_item_pack_defaults()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  new.purchase_quantity := coalesce(new.purchase_quantity, new.quantity);
  new.purchase_unit := coalesce(nullif(new.purchase_unit, ''), new.unit);
  new.units_per_purchase := coalesce(nullif(new.units_per_purchase, 0), 1);
  return new;
end;
$$;

drop trigger if exists trg_purchase_items_pack_defaults on public.purchase_items;
create trigger trg_purchase_items_pack_defaults
before insert or update on public.purchase_items
for each row execute function public.procurement_set_purchase_item_pack_defaults();

create or replace view public.v_purchase_price_history as
select
  pi.product_id,
  pp.name as product_name,
  p.id as purchase_id,
  p.purchase_number,
  p.purchase_date,
  p.status,
  p.supplier_id,
  s.trade_name as supplier_name,
  pi.quantity,
  pi.unit,
  pi.unit_price,
  pi.real_unit_cost,
  pi.real_total_cost,
  pi.purchase_quantity,
  pi.purchase_unit,
  pi.units_per_purchase,
  case
    when coalesce(pi.purchase_quantity, 0) > 0 then round(pi.real_total_cost / pi.purchase_quantity, 6)
    else null
  end as real_purchase_unit_cost
from public.purchase_items pi
join public.purchases p on p.id = pi.purchase_id
left join public.purchase_products pp on pp.id = pi.product_id
left join public.suppliers s on s.id = p.supplier_id;
