-- ============================================================
-- AgriTrace V2
-- Organization-scoped lots linked to one harvest
-- Preserve legacy rows without inventing ownership or origin.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- NEW COLUMNS
-- Nullable origin links preserve existing legacy records.
-- INSERT policies require complete links for new application rows.
-- ------------------------------------------------------------

alter table public.lots
  add column organization_id uuid,
  add column harvest_id uuid,
  add column is_active boolean not null default true;

alter table public.lots
  add constraint lots_organization_fk
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict,

  add constraint lots_harvest_organization_fk
    foreign key (organization_id, harvest_id)
    references public.harvests (organization_id, id)
    on delete restrict,

  add constraint lots_v2_scope_valid
    check (
      (
        organization_id is null
        and harvest_id is null
      )
      or
      (
        organization_id is not null
        and harvest_id is not null
        and owner_id is not null
        and length(trim(id)) > 0
      )
    ),

  add constraint lots_organization_id_id_key
    unique (organization_id, id);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index lots_organization_harvest_idx
  on public.lots (organization_id, harvest_id);

create index lots_organization_active_idx
  on public.lots (organization_id, is_active);

-- ------------------------------------------------------------
-- UPDATED TIMESTAMP
-- Preserve the existing bigint milliseconds format.
-- Leave the existing owner trigger unchanged.
-- ------------------------------------------------------------

create function public.set_lot_v2_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new."updatedAt" :=
    (extract(epoch from pg_catalog.now()) * 1000)::bigint;
  return new;
end;
$$;

revoke all privileges
on function public.set_lot_v2_updated_at()
from public, anon, authenticated;

create trigger lots_v2_set_updated_at
before update on public.lots
for each row
execute function public.set_lot_v2_updated_at();

-- ------------------------------------------------------------
-- REMOVE REVIEWED LEGACY POLICIES
-- ------------------------------------------------------------

drop policy if exists lots_delete_anon on public.lots;
drop policy if exists lots_delete_own_or_operator on public.lots;
drop policy if exists lots_insert_anon on public.lots;
drop policy if exists lots_insert_own_or_operator on public.lots;
drop policy if exists lots_select_anon on public.lots;
drop policy if exists lots_select_own_or_operator on public.lots;
drop policy if exists lots_update_anon on public.lots;
drop policy if exists lots_update_own_or_operator on public.lots;

-- Stop rather than accidentally leave an unreviewed policy active.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lots'
  ) then
    raise exception
      'Unexpected lots policies remain. Review them before applying migration 007.';
  end if;
end
$$;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY AND PRIVILEGES
-- No direct anonymous access or physical deletion.
-- Public QR access will be implemented separately.
-- ------------------------------------------------------------

alter table public.lots enable row level security;

revoke all privileges
on table public.lots
from public, anon, authenticated;

grant select
on table public.lots
to authenticated;

grant insert (
  id,
  organization_id,
  harvest_id,
  owner_id,
  product_en,
  product_es,
  origin,
  harvest_date,
  "harvestDate",
  batch,
  notes,
  rating,
  photos,
  created_at,
  "createdAt",
  is_active
)
on table public.lots
to authenticated;

grant update (
  product_en,
  product_es,
  origin,
  harvest_date,
  "harvestDate",
  batch,
  notes,
  rating,
  photos,
  is_active
)
on table public.lots
to authenticated;

-- ------------------------------------------------------------
-- SELECT
-- Legacy rows with no organization are retained but not exposed.
-- ------------------------------------------------------------

create policy lots_select_active_members
on public.lots
for select
to authenticated
using (
  organization_id is not null
  and public.is_active_org_member(organization_id)
);

-- ------------------------------------------------------------
-- INSERT
-- Owner/Admin/Operator matches existing lot create permissions.
-- ------------------------------------------------------------

create policy lots_insert_owner_admin_operator
on public.lots
for insert
to authenticated
with check (
  organization_id is not null
  and harvest_id is not null
  and owner_id = auth.uid()
  and public.has_org_role(
    organization_id,
    array[
      'owner'::public.organization_role,
      'admin'::public.organization_role,
      'operator'::public.organization_role
    ]
  )
);

-- ------------------------------------------------------------
-- UPDATE
-- Origin links, id, creator and creation timestamps are excluded
-- from application UPDATE grants.
-- ------------------------------------------------------------

create policy lots_update_owner_admin_operator
on public.lots
for update
to authenticated
using (
  organization_id is not null
  and public.has_org_role(
    organization_id,
    array[
      'owner'::public.organization_role,
      'admin'::public.organization_role,
      'operator'::public.organization_role
    ]
  )
)
with check (
  organization_id is not null
  and harvest_id is not null
  and public.has_org_role(
    organization_id,
    array[
      'owner'::public.organization_role,
      'admin'::public.organization_role,
      'operator'::public.organization_role
    ]
  )
);

-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

comment on column public.lots.organization_id is
'Organization owning the lot. Null only for retained legacy records.';

comment on column public.lots.harvest_id is
'One source harvest per lot. Must belong to the same organization.';

comment on column public.lots.owner_id is
'Original creating user, preserved by the existing owner trigger.';

comment on column public.lots.is_active is
'Administrative soft-disable flag. Physical deletion is unavailable to application users.';

commit;
