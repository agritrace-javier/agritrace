-- ============================================================
-- AgriTrace V2
-- Fields
-- Farm-scoped agricultural fields / plots
-- ============================================================

begin;


-- ------------------------------------------------------------
-- HARDEN FARMS
--
-- Fields use a composite foreign key:
-- (organization_id, farm_id)
--
-- This unique constraint allows PostgreSQL to guarantee
-- that a field's farm belongs to the same organization.
--
-- IMPORTANT:
-- Do not drop this constraint if it already exists because
-- fields_farm_organization_fk may already depend on it.
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'farms_organization_id_id_key'
      and conrelid = 'public.farms'::regclass
  ) then

    alter table public.farms
    add constraint farms_organization_id_id_key
    unique (organization_id, id);

  end if;
end
$$;


-- ------------------------------------------------------------
-- FIELDS
-- ------------------------------------------------------------

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  farm_id uuid not null,

  name text not null,

  code text,

  area_hectares numeric(12,2),

  description text,

  soil_type text,

  elevation_meters numeric(10,2),

  latitude numeric(9,6),
  longitude numeric(9,6),

  is_active boolean not null default true,

  created_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fields_name_not_blank
    check (
      length(trim(name)) > 0
    ),

  constraint fields_area_valid
    check (
      area_hectares is null
      or area_hectares >= 0
    ),

  constraint fields_latitude_valid
    check (
      latitude is null
      or latitude between -90 and 90
    ),

  constraint fields_longitude_valid
    check (
      longitude is null
      or longitude between -180 and 180
    ),

  constraint fields_farm_organization_fk
    foreign key (organization_id, farm_id)
    references public.farms (organization_id, id)
    on delete restrict
);


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists fields_organization_id_idx
  on public.fields (organization_id);

create index if not exists fields_farm_id_idx
  on public.fields (farm_id);

create index if not exists fields_organization_farm_idx
  on public.fields (organization_id, farm_id);

create index if not exists fields_organization_active_idx
  on public.fields (organization_id, is_active);

create index if not exists fields_created_by_idx
  on public.fields (created_by);


-- ------------------------------------------------------------
-- UPDATED_AT
-- Uses the existing AgriTrace set_updated_at() function.
-- ------------------------------------------------------------

drop trigger if exists fields_set_updated_at
on public.fields;

create trigger fields_set_updated_at
before update on public.fields
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.fields
enable row level security;


-- ------------------------------------------------------------
-- PRIVILEGES
--
-- Authenticated users may attempt SELECT / INSERT / UPDATE.
-- RLS remains the final authority.
--
-- DELETE is intentionally unavailable.
-- ------------------------------------------------------------

revoke all privileges
on table public.fields
from authenticated;

grant select, insert, update
on table public.fields
to authenticated;


-- ------------------------------------------------------------
-- SELECT
--
-- Any active organization member may read fields belonging
-- to that organization.
-- ------------------------------------------------------------

drop policy if exists fields_select_active_members
on public.fields;

create policy fields_select_active_members
on public.fields
for select
to authenticated
using (
  public.is_active_org_member(organization_id)
);


-- ------------------------------------------------------------
-- INSERT
--
-- Owner/Admin may create fields.
--
-- created_by must match the authenticated user.
--
-- The composite foreign key additionally guarantees that the
-- selected farm belongs to the same organization.
-- ------------------------------------------------------------

drop policy if exists fields_insert_owner_admin
on public.fields;

create policy fields_insert_owner_admin
on public.fields
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
--
-- Owner/Admin may modify fields belonging to organizations
-- where they currently hold one of those active roles.
-- ------------------------------------------------------------

drop policy if exists fields_update_owner_admin
on public.fields;

create policy fields_update_owner_admin
on public.fields
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
--
-- Intentionally disabled.
--
-- Fields are soft-disabled through is_active instead of being
-- deleted directly, preserving agricultural traceability.
-- ------------------------------------------------------------

revoke delete
on table public.fields
from authenticated;


-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

comment on table public.fields is
'Agricultural fields or plots belonging to a farm and organization.';

comment on column public.fields.organization_id is
'Organization that owns the agricultural field.';

comment on column public.fields.farm_id is
'Farm containing the field. The farm must belong to the same organization.';

comment on column public.fields.name is
'Human-readable field or plot name.';

comment on column public.fields.code is
'Optional internal field or plot identifier.';

comment on column public.fields.area_hectares is
'Approximate field area measured in hectares.';

comment on column public.fields.soil_type is
'Optional soil type or soil classification.';

comment on column public.fields.elevation_meters is
'Approximate elevation above sea level in meters.';

comment on column public.fields.is_active is
'Soft-disable flag. Inactive fields remain available for historical traceability.';


commit;