import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { getAllBranchesSituation } from "@/lib/branch-accounts";

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const f = sp.get("from");
  const t = sp.get("to");
  const from = f ? new Date(f) : undefined;
  const to = t ? new Date(t) : undefined;

  if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const branches = await getAllBranchesSituation(from, to);
  return NextResponse.json({ branches });
}