import type { TokenPayload } from "@/lib/auth";

// AuditLog has two separate nullable actor columns; a write sets exactly one.
export function auditActor(payload: TokenPayload) {
  return payload.role === "SUPER_ADMIN"
    ? { performedByAdminId: payload.id }
    : { performedByUserId: payload.id };
}

// Names for history views (avoids guessing relation names on AuditLog)
export async function resolveActorNames(
  prisma: any,
  logs: { performedByUserId: string | null; performedByAdminId: string | null }[]
) {
  const userIds = [...new Set(logs.map((l) => l.performedByUserId).filter(Boolean))] as string[];
  const adminIds = [...new Set(logs.map((l) => l.performedByAdminId).filter(Boolean))] as string[];
  const [users, admins] = await Promise.all([
    userIds.length ? prisma.appUser.findMany({ where: { id: { in: userIds } } }) : [],
    adminIds.length ? prisma.superAdmin.findMany({ where: { id: { in: adminIds } } }) : [],
  ]);
  const map = new Map<string, string>();
  users.forEach((u: any) => map.set(u.id, u.name ?? u.fullName ?? u.email));
  admins.forEach((a: any) => map.set(a.id, a.name ?? a.fullName ?? a.email));
  return map;
}