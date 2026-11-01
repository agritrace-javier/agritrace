begin;

alter policy lot_photos_select_active_members_v2
on storage.objects
using (
  bucket_id = 'lot-photos'
  and exists (
    select 1
    from public.organizations o
    where o.id::text = (storage.foldername(storage.objects.name))[1]
      and public.is_active_org_member(o.id)
  )
);

alter policy lot_photos_insert_owner_admin_operator_v2
on storage.objects
with check (
  bucket_id = 'lot-photos'
  and array_length(storage.foldername(storage.objects.name), 1) = 2
  and exists (
    select 1
    from public.organizations o
    where o.id::text = (storage.foldername(storage.objects.name))[1]
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

commit;
