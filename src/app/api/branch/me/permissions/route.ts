import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { PERMISSION_KEYS, hasPermission } from "@/lib/permissions";

// GET /api/branch/me/permissions — which actions the logged-in staff member's
// role is currently allowed to perform
export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const entries = await Promise.all(
    PERMISSION_KEYS.map(async (key) => [key, await hasPermission(auth.role, key)] as const)
  );

  return NextResponse.json({ permissions: Object.fromEntries(entries) });
}