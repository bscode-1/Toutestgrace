import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";

export async function GET(req: NextRequest) {
  const auth: any = requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  const isManager = auth.role === "BRANCH_MANAGER";
  const isTeller = auth.role === "TELLER";
  if ((!isManager && !isTeller) || !auth.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // manager → every teller in his branch; teller → only himself
  const tellers = await prisma.appUser.findMany({
    where: isManager
      ? { branchId: auth.branchId, role: "TELLER" }
      : { id: auth.id },
    select: { id: true, name: true },
  });
  const nameOf = new Map(tellers.map((t: any) => [t.id, t.name]));

  const entries = await prisma.tellerLedgerEntry.findMany({
    where: {
      tellerId: { in: tellers.map((t: any) => t.id) },
      type: { in: ["MANAGER_FUNDING", "TELLER_RETURN"] },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const items = entries.map((e: any) => ({
    id: e.id,
    tellerId: e.tellerId,
    tellerName: nameOf.get(e.tellerId) ?? "—",
    type: e.type as "MANAGER_FUNDING" | "TELLER_RETURN",
    amount: Number(e.amount),
    date: e.createdAt,
  }));

  const totalFunded = items
    .filter((i) => i.type === "MANAGER_FUNDING")
    .reduce((s, i) => s + i.amount, 0);
  const totalReturned = items
    .filter((i) => i.type === "TELLER_RETURN")
    .reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({
    totalFunded,
    totalReturned,
    tellers: isManager ? tellers.map((t: any) => ({ id: t.id, name: t.name })) : [],
    items,
  });
}