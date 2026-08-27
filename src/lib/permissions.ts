import { prisma } from "@/lib/prisma";

export const PERMISSION_KEYS = [
  "CREATE_TRANSFER",
  "COMPLETE_PICKUP",
  "PROCESS_REFUND",
  "VIEW_TRANSACTIONS",
  "EXPORT_REPORTS",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  CREATE_TRANSFER: "Create new transfers",
  COMPLETE_PICKUP: "Complete pickups (pay out)",
  PROCESS_REFUND: "Process refunds",
  VIEW_TRANSACTIONS: "View transaction history",
  EXPORT_REPORTS: "Export reports (Excel / PDF)",
};

export const STAFF_ROLES = ["TELLER", "BRANCH_MANAGER"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Checks whether a given staff role is allowed to perform an action.
 * If no row exists yet for this role+permission combo, defaults to
 * `true` (permissive) — so the system behaves exactly as it always has
 * until a super admin actually visits the permissions page and starts
 * toggling things off.
 */
export async function hasPermission(role: string, key: PermissionKey): Promise<boolean> {
  if (role !== "TELLER" && role !== "BRANCH_MANAGER") return true; // super admin, n/a
  const row = await prisma.rolePermission.findUnique({
    where: { role_permissionKey: { role, permissionKey: key } },
  });
  return row ? row.enabled : true;
}