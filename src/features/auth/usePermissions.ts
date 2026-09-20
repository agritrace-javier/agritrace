import { useMemo } from "react";

import { useAuth } from "./AuthProvider";

export function usePermissions() {
  const {
    role,
    hasActiveMembership,
    can,
    canAny,
    canAll,
    hasRoleAtLeast,
  } = useAuth();

  return useMemo(
    () => ({
      role,
      hasActiveMembership,

      can,
      canAny,
      canAll,
      hasRoleAtLeast,

      canManageOrganization:
        can("organization.manage"),

      canManageMembers:
        can("members.manage"),

      canManageFarms:
        can("farms.manage"),

      canCreateLots:
        can("lots.create"),

      canUpdateLots:
        can("lots.update"),

      canDeleteLots:
        can("lots.delete"),

      canCreateTraceability:
        can("traceability.create"),

      canUpdateTraceability:
        can("traceability.update"),

      canPerformVerification:
        can("verification.perform"),

      canViewReports:
        can("reports.view"),

      canViewRecords:
        can("records.view"),

      isOwner:
        role === "owner",

      isAdmin:
        role === "admin",

      isOperator:
        role === "operator",

      isInspector:
        role === "inspector",

      isViewer:
        role === "viewer",
    }),
    [
      role,
      hasActiveMembership,
      can,
      canAny,
      canAll,
      hasRoleAtLeast,
    ]
  );
}