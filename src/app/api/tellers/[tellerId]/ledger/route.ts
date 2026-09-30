// src/app/api/tellers/[tellerId]/ledger/route.ts
// Revised: a teller can always view their OWN ledger; viewing someone else's needs the permission.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ tellerId: string }> }) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  const { tellerId } = await params;

  if (auth.id !== tellerId) {
    const allowed = await hasPermission(auth.role, "VIEW_TELLER_LEDGER");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await prisma.tellerLedgerEntry.findMany({
    where: { tellerId },
    orderBy: { createdAt: "desc" },
  });

  const balance = entries.reduce((sum, e) => {
    const sign = e.type === "WITHDRAWAL_PAID" || e.type === "REFUND_PAID" ? -1 : 1;
    return sum + sign * Number(e.amount);
  }, 0);

  return NextResponse.json({ balance, entries });
}