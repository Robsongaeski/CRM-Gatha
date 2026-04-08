-- Bucket de anexos do módulo Suprimentos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'procurement-attachments',
  'procurement-attachments',
  false,
  10485760,
  array['application/xml', 'text/xml', 'application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies de acesso para objetos do bucket
drop policy if exists "procurement_attachments_select" on storage.objects;
create policy "procurement_attachments_select"
on storage.objects
for select
using (
  bucket_id = 'procurement-attachments'
  and public.has_procurement_view_access(auth.uid())
);

drop policy if exists "procurement_attachments_insert" on storage.objects;
create policy "procurement_attachments_insert"
on storage.objects
for insert
with check (
  bucket_id = 'procurement-attachments'
  and public.can_manage_procurement_purchases(auth.uid())
);

drop policy if exists "procurement_attachments_update" on storage.objects;
create policy "procurement_attachments_update"
on storage.objects
for update
using (
  bucket_id = 'procurement-attachments'
  and public.can_manage_procurement_purchases(auth.uid())
)
with check (
  bucket_id = 'procurement-attachments'
  and public.can_manage_procurement_purchases(auth.uid())
);

drop policy if exists "procurement_attachments_delete" on storage.objects;
create policy "procurement_attachments_delete"
on storage.objects
for delete
using (
  bucket_id = 'procurement-attachments'
  and public.can_manage_procurement_purchases(auth.uid())
);
