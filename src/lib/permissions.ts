import "server-only";
import { prisma } from "@/lib/prisma";
import { PermissionKey } from "@/lib/permission-constants";

export async function hasPermission(role: string, key: PermissionKey): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true;
  const row = await prisma.rolePermission.findUnique({
    where: { role_permissionKey: { role, permissionKey: key } },
  });
  return row ? row.enabled : true;
}