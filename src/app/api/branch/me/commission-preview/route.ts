import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { calculateCommission, type CommissionMode } from "@/lib/commission";

// GET /api/branch/me/commission-preview?amount=100&commissionMode=DEDUCTED — live commission calc for own branch
export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const amount = Number(searchParams.get("amount"));
  const commissionModeParam = searchParams.get("commissionMode");
  const commissionMode: CommissionMode =
    commissionModeParam === "PAID_BY_SENDER" ? "PAID_BY_SENDER" : "DEDUCTED";

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
  }

  try {
    const { commissionAmount, amountPayable, totalCharged, tier } = await calculateCommission(
      auth.branchId as string,
      amount,
      commissionMode
    );
    return NextResponse.json({
      commissionAmount,
      amountPayable,
      totalCharged,
      commissionType: tier.commissionType,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}