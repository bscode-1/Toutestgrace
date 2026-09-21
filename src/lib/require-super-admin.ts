import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";

/**
 * Extracts and verifies the super admin from the Authorization header.
 * Returns the token payload if valid, or a NextResponse (401) to return early.
 */
export function requireSuperAdmin(req: NextRequest): TokenPayload | NextResponse {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const payload = verifyToken(token);

  if (!payload || payload.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized: super admin access required" }, { status: 403 });
  }

  // Kept for parity with requireStaff/requirePermission — currently a no-op
  // for SuperAdmin since that model has no mustChangePassword field yet
  // (see open schema gap). Harmless once added; SuperAdmin logins never
  // set this claim today, so payload.mustChangePassword is always falsy here.
  if (payload.mustChangePassword) {
    return NextResponse.json({ error: "Password change required" }, { status: 403 });
  }

  return payload;
}