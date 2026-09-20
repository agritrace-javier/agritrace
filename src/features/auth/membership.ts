import type { AppRole } from "./roles";

export const MEMBERSHIP_STATUSES = [
  "pending",
  "active",
  "suspended",
  "revoked",
] as const;

export type MembershipStatus =
  (typeof MEMBERSHIP_STATUSES)[number];

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: AppRole;
  status: MembershipStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug?: string | null;
};

export type ActiveMembership = {
  membership: OrganizationMembership;
  organization: OrganizationSummary | null;
};

export function isMembershipActive(
  membership: OrganizationMembership | null | undefined
): boolean {
  return membership?.status === "active";
}

export function getMembershipRole(
  membership: OrganizationMembership | null | undefined
): AppRole | null {
  if (!membership || membership.status !== "active") {
    return null;
  }

  return membership.role;
}

export function belongsToOrganization(
  membership: OrganizationMembership | null | undefined,
  organizationId: string
): boolean {
  if (!membership || membership.status !== "active") {
    return false;
  }

  return membership.organizationId === organizationId;
}