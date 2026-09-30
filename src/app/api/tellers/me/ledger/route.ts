import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getTellerBalance } from "@/lib/teller-ledger";

export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const [balance, entries] = await Promise.all([
    getTellerBalance(auth.id),
    prisma.tellerLedgerEntry.findMany({
      where: { tellerId: auth.id },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  return NextResponse.json({
    balance: Number(balance),
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: Number(e.amount),
      createdAt: e.createdAt,
    })),
  });
}