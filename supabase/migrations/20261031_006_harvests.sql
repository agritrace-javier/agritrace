-- ============================================================
-- AgriTrace V2
-- Harvests linked to organization-owned plantings
-- ============================================================

begin;

-- ------------------------------------------------------------
-- HARVESTS
-- One planting may have multiple harvest records.
-- ------------------------------------------------------------

create table public.harvests (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  planting_id uuid not null,

  name text not null,
  harvest_date date not null,

  quantity numeric(14,3) not null,
  unit text not null,

  notes text,
  is_active boolean not null default true,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint harvests_name_not_blank
    check (length(trim(name)) > 0),

  constraint harvests_quantity_valid
    check (
      quantity > 0
      and quantity <> 'NaN'::numeric
    ),

  constraint harvests_unit_valid
    check (unit in ('kg', 'g', 'lb')),

  constraint harvests_organization_id_id_key
    unique (organization_id, id),

  constraint harvests_planting_organization_fk
    foreign key (organization_id, planting_id)
    references public.plantings (organization_id, id)
    on delete restrict
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index harvests_organization_planting_date_idx
  on public.harvests (
    organization_id,
    planting_id,
    harvest_date desc
  );

create index harvests_organization_active_idx
  on public.harvests (organization_id, is_active);

create index harvests_created_by_idx
  on public.harvests (created_by);

-- ------------------------------------------------------------
-- UPDATED_AT
-- ------------------------------------------------------------

create trigger harvests_set_updated_at
before update on public.harvests
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.harvests enable row level security;

-- ------------------------------------------------------------
-- PRIVILEGES
-- Preserve planting links and creation metadata.
-- No physical deletion from the application.
-- ------------------------------------------------------------

revoke all privileges
on table public.harvests
from public, anon, authenticated;

grant select
on table public.harvests
to authenticated;

grant insert (
  organization_id,
  planting_id,
  name,
  harvest_date,
  quantity,
  unit,
  notes,
  is_active,
  created_by
)
on table public.harvests
to authenticated;

grant update (
  name,
  harvest_date,
  quantity,
  unit,
  notes,
  is_active
)
on table public.harvests
to authenticated;

-- ------------------------------------------------------------
-- SELECT
-- All active organization members.
-- ------------------------------------------------------------

create policy harvests_select_active_members
on public.harvests
for select
to authenticated
using (
  public.is_active_org_member(organization_id)
);

-- ------------------------------------------------------------
-- INSERT
-- Active Owner/Admin; creator must match authenticated user.
-- ------------------------------------------------------------

create policy harvests_insert_owner_admin
on public.harvests
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
-- Active Owner/Admin.
-- ------------------------------------------------------------

create policy harvests_update_owner_admin
on public.harvests
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

comment on table public.harvests is
'Harvest records linked to one planting within the same organization.';

comment on column public.harvests.planting_id is
'Original planting or growing cycle. The organization must match.';

comment on column public.harvests.harvest_date is
'Date on which the recorded harvest was collected.';

comment on column public.harvests.quantity is
'Positive harvested quantity, with up to three decimal places.';

comment on column public.harvests.unit is
'Unit of harvested mass: kg, g or lb. Quantities require conversion before aggregation across units.';

comment on column public.harvests.is_active is
'Administrative soft-disable flag; historical harvest records remain readable.';

commit;
