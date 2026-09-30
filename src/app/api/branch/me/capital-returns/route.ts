import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";

export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "BRANCH_MANAGER" || !auth.branchId)
    return NextResponse.json({ error: "Managers only" }, { status: 403 });

  const list = await prisma.branchCapitalReturn.findMany({
    where: { branchId: auth.branchId },
    orderBy: { recordedAt: "desc" },
    take: 2000,
    include: { partner: { select: { id: true, name: true } } },
  });

  const ids = Array.from(new Set(list.map((r) => r.recordedById)));
  const [users, admins] = await Promise.all([
    prisma.appUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.superAdmin.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const adminMap = new Map(admins.map((a) => [a.id, `${a.email} (Admin)`]));

  const returns = list.map((r) => ({
    id: r.id,
    recordedAt: r.recordedAt,
    partnerId: r.partnerId,
    partnerName: r.partner.name,
    amount: Number(r.amount),
    recordedByName: userMap.get(r.recordedById) ?? adminMap.get(r.recordedById) ?? "Unknown",
  }));

  const partners = Array.from(new Map(list.map((r) => [r.partner.id, r.partner])).values());

  return NextResponse.json({ returns, partners });
}