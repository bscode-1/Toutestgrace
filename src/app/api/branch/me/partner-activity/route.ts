import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";

export async function GET(req: NextRequest) {
  const auth: any = requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "BRANCH_MANAGER" || !auth.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [received, returned] = await Promise.all([
    prisma.partnerDistribution.findMany({
      where: { branchId: auth.branchId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.branchCapitalReturn.findMany({
      where: { branchId: auth.branchId },
      orderBy: { recordedAt: "desc" },
      take: 500,
    }),
  ]);

  const partnerIds = Array.from(
    new Set([...received.map((r) => r.partnerId), ...returned.map((r) => r.partnerId)])
  ).filter(Boolean) as string[];

  const partners = await prisma.partner.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(partners.map((p) => [p.id, p.name]));

  const items = [
    ...received.map((r: any) => ({
      id: r.id,
      type: "RECEIVED" as const,
      partnerName: nameOf.get(r.partnerId) ?? "—",
      amount: Number(r.amount),
      date: r.createdAt,
    })),
    ...returned.map((r: any) => ({
      id: r.id,
      type: "RETURNED" as const,
      partnerName: nameOf.get(r.partnerId) ?? "—",
      amount: Number(r.amount),
      date: r.recordedAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalReceived = items.filter((i) => i.type === "RECEIVED").reduce((s, i) => s + i.amount, 0);
  const totalReturned = items.filter((i) => i.type === "RETURNED").reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({ totalReceived, totalReturned, items });
}