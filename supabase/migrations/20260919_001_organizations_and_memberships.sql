-- ============================================================
-- AgriTrace V2
-- Organizations + Organization Memberships
-- ============================================================

begin;

-- ============================================================
-- ENUMS
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'organization_role'
  ) then
    create type public.organization_role as enum (
      'owner',
      'admin',
      'operator',
      'inspector',
      'viewer'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'membership_status'
  ) then
    create type public.membership_status as enum (
      'pending',
      'active',
      'suspended',
      'revoked'
    );
  end if;
end
$$;


-- ============================================================
-- ORGANIZATIONS
-- ============================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  slug text not null unique,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint organizations_name_not_blank
    check (char_length(trim(name)) > 0),

  constraint organizations_slug_format
    check (
      slug = lower(slug)
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
);


-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role public.organization_role not null
    default 'viewer',

  status public.membership_status not null
    default 'pending',

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (organization_id, user_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists
  organization_members_user_id_idx
on public.organization_members(user_id);

create index if not exists
  organization_members_organization_id_idx
on public.organization_members(organization_id);

create index if not exists
  organization_members_active_user_idx
on public.organization_members(user_id, organization_id)
where status = 'active';


-- ============================================================
-- UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists
  organizations_set_updated_at
on public.organizations;

create trigger organizations_set_updated_at
before update
on public.organizations
for each row
execute function public.set_updated_at();


drop trigger if exists
  organization_members_set_updated_at
on public.organization_members;

create trigger organization_members_set_updated_at
before update
on public.organization_members
for each row
execute function public.set_updated_at();


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function public.is_active_org_member(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'active'
  );
$$;


create or replace function public.has_org_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role = any(allowed_roles)
  );
$$;


-- ============================================================
-- FUNCTION EXECUTION PERMISSIONS
-- ============================================================

revoke all
on function public.is_active_org_member(uuid)
from public;

revoke all
on function public.has_org_role(uuid, public.organization_role[])
from public;

grant execute
on function public.is_active_org_member(uuid)
to authenticated;

grant execute
on function public.has_org_role(
  uuid,
  public.organization_role[]
)
to authenticated;


-- ============================================================
-- CREATE ORGANIZATION RPC
-- ============================================================

create or replace function public.create_organization(
  organization_name text,
  organization_slug text
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  clean_name text;
  clean_slug text;
  created_organization public.organizations;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  clean_name := trim(organization_name);
  clean_slug := lower(trim(organization_slug));

  if clean_name is null or clean_name = '' then
    raise exception 'Organization name is required';
  end if;

  if clean_slug is null or clean_slug = '' then
    raise exception 'Organization slug is required';
  end if;

  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception
      'Organization slug must contain only lowercase letters, numbers and hyphens';
  end if;

  insert into public.organizations (
    name,
    slug,
    created_by
  )
  values (
    clean_name,
    clean_slug,
    current_user_id
  )
  returning *
  into created_organization;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status
  )
  values (
    created_organization.id,
    current_user_id,
    'owner'::public.organization_role,
    'active'::public.membership_status
  );

  return created_organization;

exception
  when unique_violation then
    raise exception
      'An organization with this slug already exists';
end;
$$;


revoke all
on function public.create_organization(text, text)
from public;

grant execute
on function public.create_organization(text, text)
to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations
enable row level security;

alter table public.organization_members
enable row level security;


-- ============================================================
-- ORGANIZATIONS POLICIES
-- ============================================================

drop policy if exists
  "Members can view organizations"
on public.organizations;

create policy
  "Members can view organizations"
on public.organizations
for select
to authenticated
using (
  public.is_active_org_member(id)
);


drop policy if exists
  "Owners and admins can update organizations"
on public.organizations;

create policy
  "Owners and admins can update organizations"
on public.organizations
for update
to authenticated
using (
  public.has_org_role(
    id,
    array[
      'owner'::public.organization_role,
      'admin'::public.organization_role
    ]
  )
)
with check (
  public.has_org_role(
    id,
    array[
      'owner'::public.organization_role,
      'admin'::public.organization_role
    ]
  )
);


-- ============================================================
-- MEMBERSHIP POLICIES
-- ============================================================

drop policy if exists
  "Members can view organization memberships"
on public.organization_members;

create policy
  "Members can view organization memberships"
on public.organization_members
for select
to authenticated
using (
  public.is_active_org_member(organization_id)
);


drop policy if exists
  "Owners and admins can add organization members"
on public.organization_members;

create policy
  "Owners and admins can add organization members"
on public.organization_members
for insert
to authenticated
with check (
  (
    role <> 'owner'::public.organization_role
    and public.has_org_role(
      organization_id,
      array[
        'owner'::public.organization_role,
        'admin'::public.organization_role
      ]
    )
  )
  or
  (
    role = 'owner'::public.organization_role
    and public.has_org_role(
      organization_id,
      array[
        'owner'::public.organization_role
      ]
    )
  )
);


drop policy if exists
  "Owners and admins can update organization members"
on public.organization_members;

create policy
  "Owners and admins can update organization members"
on public.organization_members
for update
to authenticated
using (
  (
    role <> 'owner'::public.organization_role
    and public.has_org_role(
      organization_id,
      array[
        'owner'::public.organization_role,
        'admin'::public.organization_role
      ]
    )
  )
  or
  (
    role = 'owner'::public.organization_role
    and public.has_org_role(
      organization_id,
      array[
        'owner'::public.organization_role
      ]
    )
  )
)
with check (
  (
    role <> 'owner'::public.organization_role
    and public.has_org_role(
      organization_id,
      array[
        'owner'::public.organization_role,
        'admin'::public.organization_role
      ]
    )
  )
  or
  (
    role = 'owner'::public.organization_role
    and public.has_org_role(
      organization_id,
      array[
        'owner'::public.organization_role
      ]
    )
  )
);


drop policy if exists
  "Owners can remove organization members"
on public.organization_members;

create policy
  "Owners can remove organization members"
on public.organization_members
for delete
to authenticated
using (
  public.has_org_role(
    organization_id,
    array[
      'owner'::public.organization_role
    ]
  )
);


-- ============================================================
-- TABLE PRIVILEGES
-- ============================================================

revoke all
on table public.organizations
from anon;

revoke all
on table public.organization_members
from anon;

grant select, update
on table public.organizations
to authenticated;

grant select, insert, update, delete
on table public.organization_members
to authenticated;


commit;