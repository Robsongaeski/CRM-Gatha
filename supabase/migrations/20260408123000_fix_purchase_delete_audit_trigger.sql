-- Corrige exclusão de compras:
-- o trigger de auditoria (AFTER DELETE) tentava inserir em purchase_audit_log
-- referenciando a compra já removida, gerando violação de FK.
-- Mantemos auditoria para INSERT/UPDATE e ignoramos DELETE.

create or replace function public.procurement_record_purchase_audit()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

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
