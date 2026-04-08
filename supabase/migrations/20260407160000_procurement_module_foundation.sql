-- =====================================================
-- Procurement Module Foundation (Fornecedores e Compras)
-- =====================================================

create sequence if not exists public.procurement_purchase_number_seq;

create or replace function public.generate_procurement_purchase_number()
returns text
language plpgsql
as $$
declare
  v_next bigint;
begin
  v_next := nextval('public.procurement_purchase_number_seq');
  return format('CP-%s-%06s', to_char(current_date, 'YYYY'), v_next::text);
end;
$$;

create or replace function public.procurement_set_audit_user()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
  elsif tg_op = 'UPDATE' then
    new.updated_by := coalesce(auth.uid(), new.updated_by, old.updated_by);
  end if;

  return new;
end;
$$;

create table if not exists public.supplier_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.purchase_extra_cost_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  corporate_name text not null,
  trade_name text,
  cnpj text,
  state_registration text,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  website text,
  address text,
  city text,
  state text,
  zip_code text,
  supplier_type text not null default 'outros',
  lead_time_days integer,
  payment_terms text,
  minimum_order numeric(14,4),
  commercial_notes text,
  internal_notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  internal_rating numeric(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists idx_suppliers_cnpj_unique on public.suppliers(cnpj) where cnpj is not null and cnpj <> '';
create index if not exists idx_suppliers_type on public.suppliers(supplier_type);

create table if not exists public.purchase_products (
  id uuid primary key default gen_random_uuid(),
  internal_code text,
  alternate_code text,
  name text not null,
  category text not null default 'outros',
  subcategory text,
  unit text not null default 'un',
  description text,
  composition text,
  weight numeric(14,4),
  width numeric(14,4),
  color text,
  finish text,
  conversion_factor numeric(14,6) not null default 1,
  item_type text not null default 'materia_prima' check (item_type in ('materia_prima', 'produto_pronto', 'servico', 'custo_indireto')),
  preferred_supplier_id uuid references public.suppliers(id) on delete set null,
  current_average_cost numeric(14,6) not null default 0,
  last_purchase_date date,
  lowest_price_paid numeric(14,6),
  highest_price_paid numeric(14,6),
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists idx_purchase_products_internal_code_unique on public.purchase_products(internal_code) where internal_code is not null and internal_code <> '';
create index if not exists idx_purchase_products_category on public.purchase_products(category);

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid not null references public.purchase_products(id) on delete cascade,
  supplier_product_code text,
  standard_price numeric(14,6),
  standard_lead_time integer,
  minimum_quantity numeric(14,4),
  is_preferred boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint supplier_products_unique unique (supplier_id, product_id)
);

create table if not exists public.product_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.purchase_products(id) on delete cascade,
  purchase_unit text not null,
  usage_unit text not null,
  conversion_factor numeric(14,6) not null check (conversion_factor > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint product_unit_conversions_unique unique (product_id, purchase_unit, usage_unit)
);
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique default public.generate_procurement_purchase_number(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_type text not null default 'simple',
  purchase_date date not null default current_date,
  invoice_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  invoice_number text,
  payment_terms text,
  cost_center text,
  status text not null default 'quote' check (status in ('quote', 'issued', 'partially_received', 'received', 'cancelled')),
  allocation_method text not null default 'proportional_value' check (allocation_method in ('proportional_value', 'proportional_quantity', 'manual', 'specific_item')),
  gross_total numeric(14,4) not null default 0,
  discount_total numeric(14,4) not null default 0,
  freight_total numeric(14,4) not null default 0,
  insurance_total numeric(14,4) not null default 0,
  impostos_adicionais numeric(14,4) not null default 0,
  extra_cost_total numeric(14,4) not null default 0,
  other_cost_total numeric(14,4) not null default 0,
  final_total numeric(14,4) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid references public.purchase_products(id) on delete set null,
  description text,
  quantity numeric(14,4) not null check (quantity > 0),
  unit text not null,
  unit_price numeric(14,6) not null default 0 check (unit_price >= 0),
  item_discount numeric(14,4) not null default 0 check (item_discount >= 0),
  item_total numeric(14,4) not null default 0,
  freight_allocated numeric(14,4) not null default 0,
  extra_cost_allocated numeric(14,4) not null default 0,
  other_cost_allocated numeric(14,4) not null default 0,
  real_unit_cost numeric(14,6) not null default 0,
  real_total_cost numeric(14,4) not null default 0,
  notes text,
  line_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.purchase_extra_costs (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  cost_type text not null,
  description text,
  amount numeric(14,4) not null check (amount >= 0),
  allocation_method text not null default 'proportional_value' check (allocation_method in ('proportional_value', 'proportional_quantity', 'manual', 'specific_item')),
  specific_product_id uuid references public.purchase_products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.purchase_attachments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles(id) on delete set null,
  notes text
);

create table if not exists public.supplier_reviews (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  price_score smallint check (price_score between 1 and 5),
  quality_score smallint check (quality_score between 1 and 5),
  delivery_score smallint check (delivery_score between 1 and 5),
  service_score smallint check (service_score between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.material_compositions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  final_product_id uuid references public.purchase_products(id) on delete set null,
  final_unit text not null,
  expected_final_quantity numeric(14,4),
  actual_final_quantity numeric(14,4),
  total_loss_percent numeric(8,4) not null default 0,
  total_cost numeric(14,4) not null default 0,
  average_final_cost numeric(14,6) not null default 0,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.material_composition_steps (
  id uuid primary key default gen_random_uuid(),
  composition_id uuid not null references public.material_compositions(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  step_type text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  send_date date,
  return_date date,
  quantity_sent numeric(14,4),
  quantity_received numeric(14,4),
  unit text,
  loss_percent numeric(8,4) not null default 0,
  step_cost numeric(14,4) not null default 0,
  freight_cost numeric(14,4) not null default 0,
  extra_cost numeric(14,4) not null default 0,
  quality_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint material_composition_steps_unique unique (composition_id, step_order)
);

create table if not exists public.purchase_audit_log (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  action text not null,
  field_name text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  performed_by uuid references public.profiles(id) on delete set null,
  performed_at timestamptz not null default now()
);

create or replace function public.recalculate_purchase_totals(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_total_qty numeric(18,6) := 0;
  v_total_value numeric(18,6) := 0;
  v_gross numeric(14,4) := 0;
  v_discount numeric(14,4) := 0;
  v_freight numeric(14,4) := 0;
  v_other numeric(14,4) := 0;
  v_extra numeric(14,4) := 0;
  v_alloc text := 'proportional_value';
begin
  if p_purchase_id is null then
    return;
  end if;

  select coalesce(freight_total,0), coalesce(insurance_total,0) + coalesce(impostos_adicionais,0) + coalesce(other_cost_total,0), allocation_method
  into v_freight, v_other, v_alloc
  from public.purchases
  where id = p_purchase_id;

  update public.purchase_items
  set item_total = (coalesce(quantity,0) * coalesce(unit_price,0)) - coalesce(item_discount,0),
      freight_allocated = 0,
      extra_cost_allocated = 0,
      other_cost_allocated = 0
  where purchase_id = p_purchase_id;

  select coalesce(sum(quantity),0), coalesce(sum(item_total),0), coalesce(sum(coalesce(quantity,0)*coalesce(unit_price,0)),0), coalesce(sum(item_discount),0)
  into v_total_qty, v_total_value, v_gross, v_discount
  from public.purchase_items
  where purchase_id = p_purchase_id;

  update public.purchase_items i
  set freight_allocated = round(v_freight * case when v_alloc='proportional_quantity' and v_total_qty>0 then i.quantity/v_total_qty when v_total_value>0 then i.item_total/v_total_value else 0 end, 4),
      other_cost_allocated = round(v_other * case when v_alloc='proportional_quantity' and v_total_qty>0 then i.quantity/v_total_qty when v_total_value>0 then i.item_total/v_total_value else 0 end, 4)
  where i.purchase_id = p_purchase_id;

  select coalesce(sum(amount),0) into v_extra from public.purchase_extra_costs where purchase_id = p_purchase_id;
  update public.purchase_items set extra_cost_allocated = extra_cost_allocated + case when v_total_value>0 then round((item_total/v_total_value)*v_extra,4) else 0 end where purchase_id = p_purchase_id;

  update public.purchase_items
  set real_total_cost = round(item_total + freight_allocated + extra_cost_allocated + other_cost_allocated, 4),
      real_unit_cost = case when quantity > 0 then round((item_total + freight_allocated + extra_cost_allocated + other_cost_allocated)/quantity, 6) else 0 end
  where purchase_id = p_purchase_id;

  update public.purchases
  set gross_total = round(v_gross,4),
      discount_total = round(v_discount,4),
      extra_cost_total = round(v_extra,4),
      final_total = round(v_gross - v_discount + v_freight + v_other + v_extra,4)
  where id = p_purchase_id;
end;
$$;

create or replace function public.procurement_recalculate_purchase_trigger()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;
  perform public.recalculate_purchase_totals(coalesce(new.purchase_id, old.purchase_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.procurement_recalculate_purchase_header_trigger()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  perform public.recalculate_purchase_totals(new.id);
  return new;
end;
$$;

create or replace function public.procurement_recalculate_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if auth.role() <> 'service_role' and not (
    is_admin(auth.uid())
    or has_permission(auth.uid(), 'procurement.purchases.create')
    or has_permission(auth.uid(), 'procurement.purchases.edit')
  ) then
    raise exception 'Permissão negada para recalcular compra';
  end if;

  perform public.recalculate_purchase_totals(p_purchase_id);
end;
$$;

create or replace function public.procurement_record_purchase_audit()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  insert into public.purchase_audit_log (purchase_id, action, old_value, new_value, performed_by)
  values (
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) else null end,
    auth.uid()
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.recalculate_material_composition_totals(p_composition_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_total numeric(14,4) := 0;
  v_sent numeric(14,4) := 0;
  v_received numeric(14,4) := 0;
begin
  select coalesce(sum(step_cost + freight_cost + extra_cost),0), coalesce(sum(quantity_sent),0), coalesce(sum(quantity_received),0)
  into v_total, v_sent, v_received
  from public.material_composition_steps
  where composition_id = p_composition_id;

  update public.material_compositions
  set total_cost = round(v_total,4),
      total_loss_percent = case when v_sent > 0 then round(((v_sent-v_received)/v_sent)*100,4) else 0 end,
      average_final_cost = case when coalesce(actual_final_quantity,0) > 0 then round(v_total/actual_final_quantity,6) when v_received > 0 then round(v_total/v_received,6) else 0 end,
      updated_at = now()
  where id = p_composition_id;
end;
$$;

create or replace function public.procurement_recalculate_material_steps_trigger()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  perform public.recalculate_material_composition_totals(coalesce(new.composition_id, old.composition_id));
  return coalesce(new, old);
end;
$$;

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
  pi.real_total_cost
from public.purchase_items pi
join public.purchases p on p.id = pi.purchase_id
left join public.purchase_products pp on pp.id = pi.product_id
left join public.suppliers s on s.id = p.supplier_id;

create or replace view public.v_purchase_price_indicators as
with b as (
  select
    product_id,
    purchase_date,
    real_unit_cost,
    row_number() over (partition by product_id order by purchase_date desc, purchase_id desc) as rn,
    avg(real_unit_cost) filter (where purchase_date >= (current_date - interval '90 days')) over (partition by product_id) as avg_90d,
    avg(real_unit_cost) filter (where purchase_date >= (current_date - interval '180 days')) over (partition by product_id) as avg_180d
  from public.v_purchase_price_history
  where product_id is not null
    and status in ('issued', 'partially_received', 'received')
)
select
  b.product_id,
  max(case when b.rn = 1 then b.real_unit_cost end) as last_price,
  max(case when b.rn = 2 then b.real_unit_cost end) as previous_price,
  max(b.avg_90d) as avg_90d,
  max(b.avg_180d) as avg_180d,
  min(b.real_unit_cost) as min_price,
  max(b.real_unit_cost) as max_price
from b
group by b.product_id;

do $$
declare
  t text;
begin
  foreach t in array array['supplier_types','product_categories','purchase_extra_cost_types','suppliers','purchase_products','supplier_products','product_unit_conversions','purchases','purchase_items','purchase_extra_costs','material_compositions','material_composition_steps']
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I;', t, t);
    execute format('create trigger trg_%s_updated_at before update on public.%I for each row execute function public.update_updated_at_column();', t, t);
    execute format('drop trigger if exists trg_%s_audit_user on public.%I;', t, t);
    execute format('create trigger trg_%s_audit_user before insert or update on public.%I for each row execute function public.procurement_set_audit_user();', t, t);
  end loop;
end $$;

drop trigger if exists trg_purchases_audit_log on public.purchases;
create trigger trg_purchases_audit_log after insert or update or delete on public.purchases for each row execute function public.procurement_record_purchase_audit();

drop trigger if exists trg_purchase_items_recalculate on public.purchase_items;
create trigger trg_purchase_items_recalculate after insert or delete on public.purchase_items for each row execute function public.procurement_recalculate_purchase_trigger();

drop trigger if exists trg_purchase_items_recalculate_update on public.purchase_items;
create trigger trg_purchase_items_recalculate_update after update of quantity, unit_price, item_discount, product_id, purchase_id on public.purchase_items for each row execute function public.procurement_recalculate_purchase_trigger();

drop trigger if exists trg_purchase_extra_costs_recalculate on public.purchase_extra_costs;
create trigger trg_purchase_extra_costs_recalculate after insert or update or delete on public.purchase_extra_costs for each row execute function public.procurement_recalculate_purchase_trigger();

drop trigger if exists trg_purchases_recalculate_header on public.purchases;
create trigger trg_purchases_recalculate_header after update of freight_total, insurance_total, impostos_adicionais, other_cost_total, allocation_method on public.purchases for each row execute function public.procurement_recalculate_purchase_header_trigger();

drop trigger if exists trg_material_steps_recalculate on public.material_composition_steps;
create trigger trg_material_steps_recalculate after insert or update or delete on public.material_composition_steps for each row execute function public.procurement_recalculate_material_steps_trigger();

insert into public.permissions (id, modulo, acao, descricao, categoria)
values
  ('procurement.module.view', 'procurement', 'module_view', 'Visualizar módulo de Fornecedores e Compras', 'Suprimentos'),
  ('procurement.suppliers.view', 'procurement', 'suppliers_view', 'Visualizar fornecedores', 'Suprimentos'),
  ('procurement.suppliers.create', 'procurement', 'suppliers_create', 'Cadastrar fornecedores', 'Suprimentos'),
  ('procurement.suppliers.edit', 'procurement', 'suppliers_edit', 'Editar fornecedores', 'Suprimentos'),
  ('procurement.products.view', 'procurement', 'products_view', 'Visualizar produtos e insumos de compra', 'Suprimentos'),
  ('procurement.products.create', 'procurement', 'products_create', 'Cadastrar produtos e insumos de compra', 'Suprimentos'),
  ('procurement.products.edit', 'procurement', 'products_edit', 'Editar produtos e insumos de compra', 'Suprimentos'),
  ('procurement.purchases.view', 'procurement', 'purchases_view', 'Visualizar compras', 'Suprimentos'),
  ('procurement.purchases.create', 'procurement', 'purchases_create', 'Cadastrar compras', 'Suprimentos'),
  ('procurement.purchases.edit', 'procurement', 'purchases_edit', 'Editar compras', 'Suprimentos'),
  ('procurement.purchases.delete', 'procurement', 'purchases_delete', 'Excluir/cancelar compras', 'Suprimentos'),
  ('procurement.prices.view', 'procurement', 'prices_view', 'Visualizar histórico e comparativo de preços', 'Suprimentos'),
  ('procurement.reports.view', 'procurement', 'reports_view', 'Visualizar relatórios de compras', 'Suprimentos'),
  ('procurement.compositions.manage', 'procurement', 'compositions_manage', 'Gerenciar composição de materiais por etapas', 'Suprimentos')
on conflict (id) do update set modulo = excluded.modulo, acao = excluded.acao, descricao = excluded.descricao, categoria = excluded.categoria;

insert into public.profile_permissions (profile_id, permission_id)
select sp.id, p.id
from public.system_profiles sp
join public.permissions p on p.id like 'procurement.%'
where sp.codigo = 'admin'
on conflict do nothing;

insert into public.profile_permissions (profile_id, permission_id)
select sp.id, p.id
from public.system_profiles sp
join public.permissions p on p.id in ('procurement.module.view','procurement.suppliers.view','procurement.products.view','procurement.purchases.view','procurement.prices.view','procurement.reports.view')
where sp.codigo in ('financeiro', 'pcp')
on conflict do nothing;

create or replace function public.has_procurement_view_access(_user uuid)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select _user is not null and (
    is_admin(_user)
    or has_permission(_user, 'procurement.module.view')
    or has_permission(_user, 'procurement.suppliers.view')
    or has_permission(_user, 'procurement.products.view')
    or has_permission(_user, 'procurement.purchases.view')
    or has_permission(_user, 'procurement.prices.view')
    or has_permission(_user, 'procurement.reports.view')
    or has_permission(_user, 'procurement.compositions.manage')
  );
$$;

create or replace function public.can_manage_procurement_suppliers(_user uuid)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select _user is not null and (is_admin(_user) or has_permission(_user, 'procurement.suppliers.create') or has_permission(_user, 'procurement.suppliers.edit'));
$$;

create or replace function public.can_manage_procurement_products(_user uuid)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select _user is not null and (is_admin(_user) or has_permission(_user, 'procurement.products.create') or has_permission(_user, 'procurement.products.edit'));
$$;

create or replace function public.can_manage_procurement_purchases(_user uuid)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select _user is not null and (is_admin(_user) or has_permission(_user, 'procurement.purchases.create') or has_permission(_user, 'procurement.purchases.edit') or has_permission(_user, 'procurement.purchases.delete'));
$$;

create or replace function public.can_manage_procurement_compositions(_user uuid)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select _user is not null and (is_admin(_user) or has_permission(_user, 'procurement.compositions.manage'));
$$;

alter table public.supplier_types enable row level security;
alter table public.product_categories enable row level security;
alter table public.purchase_extra_cost_types enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_products enable row level security;
alter table public.supplier_products enable row level security;
alter table public.product_unit_conversions enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.purchase_extra_costs enable row level security;
alter table public.purchase_attachments enable row level security;
alter table public.supplier_reviews enable row level security;
alter table public.material_compositions enable row level security;
alter table public.material_composition_steps enable row level security;
alter table public.purchase_audit_log enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'supplier_types','product_categories','purchase_extra_cost_types','suppliers','purchase_products','supplier_products',
    'product_unit_conversions','purchases','purchase_items','purchase_extra_costs','purchase_attachments','supplier_reviews',
    'material_compositions','material_composition_steps','purchase_audit_log'
  ]
  loop
    execute format('drop policy if exists %I_select on public.%I', tbl, tbl);
    execute format('create policy %I_select on public.%I for select using (public.has_procurement_view_access(auth.uid()))', tbl, tbl);
  end loop;
end $$;

drop policy if exists supplier_types_modify on public.supplier_types;
create policy supplier_types_modify on public.supplier_types for all using (public.can_manage_procurement_suppliers(auth.uid())) with check (public.can_manage_procurement_suppliers(auth.uid()));

drop policy if exists product_categories_modify on public.product_categories;
create policy product_categories_modify on public.product_categories for all using (public.can_manage_procurement_products(auth.uid())) with check (public.can_manage_procurement_products(auth.uid()));

drop policy if exists purchase_extra_cost_types_modify on public.purchase_extra_cost_types;
create policy purchase_extra_cost_types_modify on public.purchase_extra_cost_types for all using (public.can_manage_procurement_purchases(auth.uid())) with check (public.can_manage_procurement_purchases(auth.uid()));

drop policy if exists suppliers_insert on public.suppliers;
create policy suppliers_insert on public.suppliers for insert with check (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.suppliers.create'));
drop policy if exists suppliers_update on public.suppliers;
create policy suppliers_update on public.suppliers for update using (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.suppliers.edit')) with check (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.suppliers.edit'));
drop policy if exists suppliers_delete on public.suppliers;
create policy suppliers_delete on public.suppliers for delete using (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.suppliers.edit'));

drop policy if exists purchase_products_insert on public.purchase_products;
create policy purchase_products_insert on public.purchase_products for insert with check (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.products.create'));
drop policy if exists purchase_products_update on public.purchase_products;
create policy purchase_products_update on public.purchase_products for update using (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.products.edit')) with check (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.products.edit'));
drop policy if exists purchase_products_delete on public.purchase_products;
create policy purchase_products_delete on public.purchase_products for delete using (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.products.edit'));

drop policy if exists supplier_products_modify on public.supplier_products;
create policy supplier_products_modify on public.supplier_products for all using (public.can_manage_procurement_products(auth.uid())) with check (public.can_manage_procurement_products(auth.uid()));

drop policy if exists product_unit_conversions_modify on public.product_unit_conversions;
create policy product_unit_conversions_modify on public.product_unit_conversions for all using (public.can_manage_procurement_products(auth.uid())) with check (public.can_manage_procurement_products(auth.uid()));

drop policy if exists purchases_insert on public.purchases;
create policy purchases_insert on public.purchases for insert with check (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.purchases.create'));
drop policy if exists purchases_update on public.purchases;
create policy purchases_update on public.purchases for update using (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.purchases.edit')) with check (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.purchases.edit'));
drop policy if exists purchases_delete on public.purchases;
create policy purchases_delete on public.purchases for delete using (is_admin(auth.uid()) or has_permission(auth.uid(), 'procurement.purchases.delete'));

drop policy if exists purchase_items_modify on public.purchase_items;
create policy purchase_items_modify on public.purchase_items for all using (public.can_manage_procurement_purchases(auth.uid())) with check (public.can_manage_procurement_purchases(auth.uid()));

drop policy if exists purchase_extra_costs_modify on public.purchase_extra_costs;
create policy purchase_extra_costs_modify on public.purchase_extra_costs for all using (public.can_manage_procurement_purchases(auth.uid())) with check (public.can_manage_procurement_purchases(auth.uid()));

drop policy if exists purchase_attachments_modify on public.purchase_attachments;
create policy purchase_attachments_modify on public.purchase_attachments for all using (public.can_manage_procurement_purchases(auth.uid())) with check (public.can_manage_procurement_purchases(auth.uid()));

drop policy if exists supplier_reviews_modify on public.supplier_reviews;
create policy supplier_reviews_modify on public.supplier_reviews for all using (public.can_manage_procurement_suppliers(auth.uid())) with check (public.can_manage_procurement_suppliers(auth.uid()));

drop policy if exists material_compositions_modify on public.material_compositions;
create policy material_compositions_modify on public.material_compositions for all using (public.can_manage_procurement_compositions(auth.uid())) with check (public.can_manage_procurement_compositions(auth.uid()));

drop policy if exists material_composition_steps_modify on public.material_composition_steps;
create policy material_composition_steps_modify on public.material_composition_steps for all using (public.can_manage_procurement_compositions(auth.uid())) with check (public.can_manage_procurement_compositions(auth.uid()));

drop policy if exists purchase_audit_log_insert on public.purchase_audit_log;
create policy purchase_audit_log_insert on public.purchase_audit_log for insert with check (public.can_manage_procurement_purchases(auth.uid()) or auth.role() = 'service_role');
drop policy if exists purchase_audit_log_delete on public.purchase_audit_log;
create policy purchase_audit_log_delete on public.purchase_audit_log for delete using (is_admin(auth.uid()));

insert into public.supplier_types (name, description, sort_order)
values
  ('materia-prima', 'Fornecedor de matéria-prima', 10),
  ('tecido pronto', 'Fornecedor de tecido pronto', 20),
  ('fio', 'Fornecedor de fio', 30),
  ('tecelagem', 'Serviço de tecelagem', 40),
  ('tinturaria', 'Serviço de tinturaria', 50),
  ('acabamento', 'Serviço de acabamento', 60),
  ('aviamentos', 'Fornecedor de aviamentos', 70),
  ('embalagem', 'Fornecedor de embalagens', 80),
  ('transporte', 'Transporte/frete', 90),
  ('manutencao', 'Serviços de manutenção', 100),
  ('servico tecnico', 'Serviço técnico especializado', 110),
  ('outros', 'Outros tipos de fornecedores', 999)
on conflict (name) do nothing;

insert into public.product_categories (name, description, sort_order)
values
  ('malha', 'Malha', 10),
  ('tecido pronto', 'Tecido pronto', 20),
  ('fio', 'Fio', 30),
  ('ribana', 'Ribana', 40),
  ('tinta', 'Tinta', 50),
  ('aviamento', 'Aviamento', 60),
  ('etiqueta', 'Etiqueta', 70),
  ('embalagem', 'Embalagem', 80),
  ('servico terceirizado', 'Serviço terceirizado', 90),
  ('frete', 'Frete', 100),
  ('instalacao', 'Instalação', 110),
  ('manutencao', 'Manutenção', 120),
  ('outros', 'Outros', 999)
on conflict (name) do nothing;

insert into public.purchase_extra_cost_types (name, description, sort_order)
values
  ('instalacao', 'Instalação', 10),
  ('descarga', 'Descarga', 20),
  ('beneficiamento', 'Beneficiamento', 30),
  ('frete adicional', 'Frete adicional', 40),
  ('taxa', 'Taxa', 50),
  ('armazenamento', 'Armazenamento', 60),
  ('conferencia', 'Conferência', 70),
  ('embalagem extra', 'Embalagem extra', 80),
  ('outros', 'Outros custos', 999)
on conflict (name) do nothing;

