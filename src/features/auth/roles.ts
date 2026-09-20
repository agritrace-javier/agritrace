export const APP_ROLES = [
  "owner",
  "admin",
  "operator",
  "inspector",
  "viewer",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_PERMISSIONS = [
  "organization.manage",
  "members.manage",
  "farms.manage",
  "lots.create",
  "lots.update",
  "lots.delete",
  "traceability.create",
  "traceability.update",
  "verification.perform",
  "reports.view",
  "records.view",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export type RoleDefinition = {
  role: AppRole;
  label: string;
  description: string;
  permissions: readonly AppPermission[];
};

export const ROLE_DEFINITIONS: Record<AppRole, RoleDefinition> = {
  owner: {
    role: "owner",
    label: "Owner",
    description:
      "Full control of the organization, members, farms, lots and traceability records.",
    permissions: APP_PERMISSIONS,
  },

  admin: {
    role: "admin",
    label: "Admin",
    description:
      "Manages organization operations, members, farms and agricultural records.",
    permissions: [
      "members.manage",
      "farms.manage",
      "lots.create",
      "lots.update",
      "lots.delete",
      "traceability.create",
      "traceability.update",
      "verification.perform",
      "reports.view",
      "records.view",
    ],
  },

  operator: {
    role: "operator",
    label: "Operator",
    description:
      "Creates and updates lots and records agricultural traceability events.",
    permissions: [
      "lots.create",
      "lots.update",
      "traceability.create",
      "traceability.update",
      "reports.view",
      "records.view",
    ],
  },

  inspector: {
    role: "inspector",
    label: "Inspector",
    description:
      "Reviews agricultural records and performs verification activities.",
    permissions: [
      "verification.perform",
      "reports.view",
      "records.view",
    ],
  },

  viewer: {
    role: "viewer",
    label: "Viewer",
    description:
      "Read-only access to authorized agricultural records and reports.",
    permissions: [
      "reports.view",
      "records.view",
    ],
  },
};

export const ROLE_PRIORITY: Record<AppRole, number> = {
  owner: 50,
  admin: 40,
  operator: 30,
  inspector: 20,
  viewer: 10,
};

export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" &&
    APP_ROLES.includes(value as AppRole)
  );
}

export function hasPermission(
  role: AppRole | null | undefined,
  permission: AppPermission
): boolean {
  if (!role) return false;

  return ROLE_DEFINITIONS[role].permissions.includes(permission);
}

export function hasAnyPermission(
  role: AppRole | null | undefined,
  permissions: readonly AppPermission[]
): boolean {
  if (!role) return false;

  return permissions.some((permission) =>
    hasPermission(role, permission)
  );
}

export function hasAllPermissions(
  role: AppRole | null | undefined,
  permissions: readonly AppPermission[]
): boolean {
  if (!role) return false;

  return permissions.every((permission) =>
    hasPermission(role, permission)
  );
}

export function isRoleAtLeast(
  role: AppRole | null | undefined,
  requiredRole: AppRole
): boolean {
  if (!role) return false;

  return ROLE_PRIORITY[role] >= ROLE_PRIORITY[requiredRole];
}

export function getRoleDefinition(
  role: AppRole
): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

export function getRoleLabel(
  role: AppRole | null | undefined
): string {
  if (!role) return "No role";

  return ROLE_DEFINITIONS[role].label;
}