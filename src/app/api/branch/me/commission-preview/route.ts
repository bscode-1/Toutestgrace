import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { calculateCommission } from "@/lib/commission";

// GET /api/branch/me/commission-preview?amount=100 — live commission calc for own branch
export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const amount = Number(searchParams.get("amount"));

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
  }

  try {
    const { commissionAmount, amountPayable, tier } = await calculateCommission(
      auth.branchId as string,
      amount
    );
    return NextResponse.json({
      commissionAmount,
      amountPayable,
      commissionType: tier.commissionType,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
