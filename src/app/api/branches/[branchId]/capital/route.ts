import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { calculateBranchCapital } from "@/lib/branch-capital";
import { getBranchCashPosition } from "@/lib/branch-cash";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = await requirePermission(req, "VIEW_BRANCH_CAPITAL");
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;

  try {
    const capital = await calculateBranchCapital(branchId);
    const cash: any = await getBranchCashPosition(branchId);
    const cashPosition = typeof cash === "number" ? cash : Number(cash?.cashPosition ?? 0);

    return NextResponse.json({ ...capital, cashPosition });
  } catch (err) {
    console.error("GET /api/branches/[branchId]/capital error:", err);
    return NextResponse.json({ error: "Failed to compute branch capital" }, { status: 500 });
  }
}