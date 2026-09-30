import { prisma } from "@/lib/prisma"; // match the import style your other files use
import type { TokenPayload } from "@/lib/auth";

export function auditActor(p: TokenPayload) {
  return p.role === "SUPER_ADMIN"
    ? { performedByAdminId: p.id as string | null, performedByUserId: null as string | null }
    : { performedByAdminId: null as string | null, performedByUserId: p.id as string | null };
}

type ActorRef = {
  performedByAdminId: string | null;
  performedByUserId: string | null;
};

// returns { [actorId]: name }
export async function resolveActorNames(
  logs: ActorRef[]
): Promise<Record<string, string>> {
  const adminIds = [...new Set(logs.map((l) => l.performedByAdminId).filter((x): x is string => !!x))];
  const userIds = [...new Set(logs.map((l) => l.performedByUserId).filter((x): x is string => !!x))];

  const [admins, users] = await Promise.all([
    adminIds.length
      ? prisma.superAdmin.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    userIds.length
      ? prisma.appUser.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const map: Record<string, string> = {};
  admins.forEach((a) => (map[a.id] = a.name));
  users.forEach((u) => (map[u.id] = u.name));
  return map;
}