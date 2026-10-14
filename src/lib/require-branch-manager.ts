import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function requireBranchManager(req: NextRequest) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.mustChangePassword) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (payload.role !== "BRANCH_MANAGER") {
    return { error: NextResponse.json({ error: "This user cannot do this" }, { status: 403 }) };
  }
  return { payload };
}