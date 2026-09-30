import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { getBranchCashPosition } from "@/lib/branch-cash";

export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.branchId) {
    return NextResponse.json({ error: "No branch assigned" }, { status: 400 });
  }
  if (auth.role !== "BRANCH_MANAGER" && auth.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getBranchCashPosition(auth.branchId));
}