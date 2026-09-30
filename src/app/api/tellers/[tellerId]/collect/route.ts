import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getTellerBalance, recordTellerLedgerEntry } from "@/lib/teller-ledger";

const schema = z.object({
  amount: z.number().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tellerId: string }> }
) {
  const auth = await requirePermission(req, "FUND_TELLER");
  if (auth instanceof NextResponse) return auth;

  const { tellerId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { amount } = parsed.data;

  const teller = await prisma.appUser.findUnique({ where: { id: tellerId } });
  if (!teller) return NextResponse.json({ error: "Teller not found" }, { status: 404 });

  // a manager can only collect from tellers in their own branch
  if (auth.role !== "SUPER_ADMIN" && auth.branchId !== teller.branchId) {
    return NextResponse.json({ error: "Teller is not in your branch" }, { status: 403 });
  }

  const balance = await getTellerBalance(tellerId);
  if (amount > balance) {
    return NextResponse.json(
      { error: `Teller only holds ${balance.toFixed(2)}` },
      { status: 400 }
    );
  }

  await recordTellerLedgerEntry({
    tellerId,
    type: "TELLER_RETURN",
    amount,
    refType: "MANAGER_COLLECTION",
    givenById: auth.id,
  });

  return NextResponse.json({ ok: true, newBalance: balance - amount });
}