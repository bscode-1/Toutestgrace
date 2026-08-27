import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";

/**
 * Extracts and verifies a branch staff member (teller or branch manager)
 * from the Authorization header. Returns the token payload if valid,
 * or a NextResponse (401/403) to return early.
 */
export function requireStaff(req: NextRequest): TokenPayload | NextResponse {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const payload = verifyToken(token);

 if (!payload || payload.role === "SUPER_ADMIN") {
  return NextResponse.json({ error: "Unauthorized: branch staff access required" }, { status: 403 });
}

  return payload;
}