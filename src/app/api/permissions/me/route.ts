// src/app/api/permissions/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PERMISSION_KEYS } from "@/lib/permission-constants";

// GET /api/permissions/me
// Returns the caller's role plus a computed { [key]: boolean } map for every
// PERMISSION_KEYS entry. Used by client components (e.g. Sidebar) to decide
// what to render without duplicating the hasPermission() logic client-side.
// Deliberately NOT gated by requireStaff/requireSuperAdmin: both SUPER_ADMIN
// and any permission-holding staff role need to call this to build their nav.
export async function GET(req: NextRequest) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const entries = await Promise.all(
    PERMISSION_KEYS.map(async (key) => [key, await hasPermission(payload.role, key)] as const)
  );

  return NextResponse.json({
    role: payload.role,
    permissions: Object.fromEntries(entries),
  });
}