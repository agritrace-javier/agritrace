-- ============================================================
-- AgriTrace V2
-- Organization crop catalog + field plantings / growing cycles
-- ============================================================

begin;

-- ------------------------------------------------------------
-- FIELDS COMPOSITE KEY
-- Preserve existing constraints.
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fields_organization_id_id_key'
      and conrelid = 'public.fields'::regclass
  ) then
    alter table public.fields
      add constraint fields_organization_id_id_key
      unique (organization_id, id);
  end if;
end
$$;

-- ------------------------------------------------------------
-- CROP TYPES
-- Each organization maintains its own catalog.
-- ------------------------------------------------------------

create table public.crop_types (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  name text not null,
  is_active boolean not null default true,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint crop_types_name_not_blank
    check (length(trim(name)) > 0),

  constraint crop_types_organization_id_id_key
    unique (organization_id, id)
);

create unique index crop_types_organization_name_key
  on public.crop_types (organization_id, lower(trim(name)));

create index crop_types_organization_active_idx
  on public.crop_types (organization_id, is_active);

create index crop_types_created_by_idx
  on public.crop_types (created_by);

-- ------------------------------------------------------------
-- PLANTINGS
-- One record represents a planting or growing cycle.
-- Multiple plantings may coexist in the same field.
-- ------------------------------------------------------------

create table public.plantings (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  field_id uuid not null,
  crop_type_id uuid not null,

  name text not null,
  variety text,

  growing_method text not null,

  established_on date,
  ended_on date,

  notes text,
  is_active boolean not null default true,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plantings_name_not_blank
    check (length(trim(name)) > 0),

  constraint plantings_variety_not_blank
    check (
      variety is null
      or length(trim(variety)) > 0
    ),

  constraint plantings_growing_method_valid
    check (growing_method in ('perennial', 'cycle')),

  constraint plantings_dates_valid
    check (
      established_on is null
      or ended_on is null
      or ended_on >= established_on
    ),

  constraint plantings_organization_id_id_key
    unique (organization_id, id),

  constraint plantings_field_organization_fk
    foreign key (organization_id, field_id)
    references public.fields (organization_id, id)
    on delete restrict,

  constraint plantings_crop_type_organization_fk
    foreign key (organization_id, crop_type_id)
    references public.crop_types (organization_id, id)
    on delete restrict
);

create index plantings_organization_field_idx
  on public.plantings (organization_id, field_id);

create index plantings_organization_crop_type_idx
  on public.plantings (organization_id, crop_type_id);

create index plantings_organization_active_idx
  on public.plantings (organization_id, is_active);

create index plantings_created_by_idx
  on public.plantings (created_by);

-- ------------------------------------------------------------
-- UPDATED_AT
-- Reuse the existing function.
-- ------------------------------------------------------------

create trigger crop_types_set_updated_at
before update on public.crop_types
for each row
execute function public.set_updated_at();

create trigger plantings_set_updated_at
before update on public.plantings
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.crop_types enable row level security;
alter table public.plantings enable row level security;

-- ------------------------------------------------------------
-- PRIVILEGES
-- Preserve origin links and creation metadata.
-- No DELETE grants or policies.
-- ------------------------------------------------------------

revoke all privileges
on table public.crop_types, public.plantings
from public, anon, authenticated;

grant select
on table public.crop_types, public.plantings
to authenticated;

grant insert (organization_id, name, is_active, created_by)
on table public.crop_types
to authenticated;

grant update (name, is_active)
on table public.crop_types
to authenticated;

grant insert (
  organization_id,
  field_id,
  crop_type_id,
  name,
  variety,
  growing_method,
  established_on,
  ended_on,
  notes,
  is_active,
  created_by
)
on table public.plantings
to authenticated;

grant update (
  name,
  variety,
  growing_method,
  established_on,
  ended_on,
  notes,
  is_active
)
on table public.plantings
to authenticated;

-- ------------------------------------------------------------
-- CROP TYPES POLICIES
-- ------------------------------------------------------------

create policy crop_types_select_active_members
on public.crop_types
for select
to authenticated
using (
  public.is_active_org_member(organization_id)
);

create policy crop_types_insert_owner_admin
on public.crop_types
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

create policy crop_types_update_owner_admin
on public.crop_types
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
-- PLANTINGS POLICIES
-- ------------------------------------------------------------

create policy plantings_select_active_members
on public.plantings
for select
to authenticated
using (
  public.is_active_org_member(organization_id)
);

create policy plantings_insert_owner_admin
on public.plantings
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

create policy plantings_update_owner_admin
on public.plantings
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
-- COMMENTS
-- ------------------------------------------------------------

comment on table public.crop_types is
'Organization-owned crop catalog, independent of field plantings.';

comment on table public.plantings is
'A perennial planting or growing cycle established within one field.';

comment on column public.plantings.growing_method is
'perennial: planting retained across harvests; cycle: individual growing cycle.';

comment on column public.plantings.established_on is
'Optional planting or establishment date; may be unknown for existing plantings.';

comment on column public.plantings.ended_on is
'Optional actual end date of the planting or growing cycle.';

comment on column public.plantings.is_active is
'Administrative soft-disable flag, independent of agricultural end date. Historical records remain readable.';

comment on column public.crop_types.is_active is
'Administrative soft-disable flag. Existing planting references are preserved.';

commit;
