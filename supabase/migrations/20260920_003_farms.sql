-- ============================================================
-- AgriTrace V2
-- Farms
-- Organization-scoped agricultural properties
-- ============================================================

begin;

-- ------------------------------------------------------------
-- FARMS
-- ------------------------------------------------------------

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  name text not null,

  country text not null,
  region text,
  municipality text,
  address text,

  latitude numeric(9,6),
  longitude numeric(9,6),

  total_area_hectares numeric(12,2),

  description text,

  is_active boolean not null default true,

  created_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint farms_name_not_blank
    check (length(trim(name)) > 0),

  constraint farms_country_not_blank
    check (length(trim(country)) > 0),

  constraint farms_latitude_valid
    check (
      latitude is null
      or latitude between -90 and 90
    ),

  constraint farms_longitude_valid
    check (
      longitude is null
      or longitude between -180 and 180
    ),

  constraint farms_area_valid
    check (
      total_area_hectares is null
      or total_area_hectares >= 0
    )
);


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists farms_organization_id_idx
  on public.farms (organization_id);

create index if not exists farms_organization_active_idx
  on public.farms (organization_id, is_active);

create index if not exists farms_created_by_idx
  on public.farms (created_by);


-- ------------------------------------------------------------
-- UPDATED_AT
-- Uses the existing AgriTrace set_updated_at() function.
-- ------------------------------------------------------------

drop trigger if exists farms_set_updated_at
on public.farms;

create trigger farms_set_updated_at
before update on public.farms
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.farms
enable row level security;


-- ------------------------------------------------------------
-- PRIVILEGES
-- RLS remains the final authority.
-- ------------------------------------------------------------

revoke all privileges
on table public.farms
from authenticated;

grant select, insert, update
on table public.farms
to authenticated;


-- ------------------------------------------------------------
-- SELECT
-- Any active member of the organization may read its farms.
-- ------------------------------------------------------------

drop policy if exists farms_select_active_members
on public.farms;

create policy farms_select_active_members
on public.farms
for select
to authenticated
using (
  public.is_active_org_member(organization_id)
);


-- ------------------------------------------------------------
-- INSERT
-- Owner/Admin may create farms.
--
-- created_by must always match the authenticated user.
-- ------------------------------------------------------------

drop policy if exists farms_insert_owner_admin
on public.farms;

create policy farms_insert_owner_admin
on public.farms
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_org_role(
    organization_id,
    array[
      'owner'::public.organization_role,
      'admin'::public.organization_role
    ]
  )
);


-- ------------------------------------------------------------
-- UPDATE
-- Owner/Admin may update farms belonging to organizations
-- where they currently hold one of those active roles.
-- ------------------------------------------------------------

drop policy if exists farms_update_owner_admin
on public.farms;

create policy farms_update_owner_admin
on public.farms
for update
to authenticated
using (
  public.has_org_role(
    organization_id,
    array[
      'owner'::public.organization_role,
      'admin'::public.organization_role
    ]
  )
)
with check (
  public.has_org_role(
    organization_id,
    array[
      'owner'::public.organization_role,
      'admin'::public.organization_role
    ]
  )
);


-- ------------------------------------------------------------
-- DELETE
-- Intentionally disabled.
--
-- Farms are soft-disabled through is_active instead of being
-- deleted directly, preserving traceability history.
-- ------------------------------------------------------------

revoke delete
on table public.farms
from authenticated;


commit;
