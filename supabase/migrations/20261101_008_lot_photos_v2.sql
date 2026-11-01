-- AgriTrace V2: organization-scoped lot photo uploads.
begin;

drop policy if exists lot_photos_delete_anon on storage.objects;
drop policy if exists lot_photos_insert_anon on storage.objects;
drop policy if exists lot_photos_select_anon on storage.objects;
drop policy if exists lot_photos_update_anon on storage.objects;

create policy lot_photos_select_active_members_v2
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lot-photos'
  and exists (
    select 1
    from public.organizations o
    where o.id::text = (storage.foldername(name))[1]
      and public.is_active_org_member(o.id)
  )
);

create policy lot_photos_insert_owner_admin_operator_v2
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lot-photos'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.organizations o
    where o.id::text = (storage.foldername(name))[1]
      and public.has_org_role(
        o.id,
        array[
          'owner'::public.organization_role,
          'admin'::public.organization_role,
          'operator'::public.organization_role
        ]
      )
  )
);

-- Uploads use new file names; no overwrite or physical deletion.
-- Existing objects and bucket visibility remain unchanged.

commit;
