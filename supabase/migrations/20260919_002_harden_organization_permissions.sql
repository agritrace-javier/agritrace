-- ============================================================
-- AgriTrace V2
-- Harden Organization Permissions
-- ============================================================

begin;

-- ------------------------------------------------------------
-- ORGANIZATIONS
-- ------------------------------------------------------------

-- Remove broad table-level UPDATE permission.
revoke update
on table public.organizations
from authenticated;

-- Authenticated users may only update these columns.
-- RLS still determines which organization they may update.
grant update (name, slug)
on table public.organizations
to authenticated;


-- ------------------------------------------------------------
-- ORGANIZATION MEMBERS
-- ------------------------------------------------------------

-- Remove every direct privilege from authenticated users.
-- Membership mutations will be performed through controlled
-- RPC functions instead of direct client table writes.
revoke all privileges
on table public.organization_members
from authenticated;

-- Restore read-only access.
-- RLS determines which membership rows are visible.
grant select
on table public.organization_members
to authenticated;


-- ------------------------------------------------------------
-- FUNCTION HARDENING
-- ------------------------------------------------------------

revoke all
on function public.set_updated_at()
from public;

revoke all
on function public.is_active_org_member(uuid)
from public;

revoke all
on function public.has_org_role(
  uuid,
  public.organization_role[]
)
from public;

revoke all
on function public.create_organization(text, text)
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

grant execute
on function public.create_organization(text, text)
to authenticated;

commit;