import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { getBranchCashPosition } from "@/lib/branch-cash";

import { requireBranchManager } from "@/lib/require-branch-manager";



export async function GET(req: NextRequest) {
  // first lines of the handler:
  const guard = requireBranchManager(req);
  if ("error" in guard) return guard.error;
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