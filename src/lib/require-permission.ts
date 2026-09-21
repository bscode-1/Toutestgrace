import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import type { TokenPayload } from "@/lib/auth";
import type { PermissionKey } from "@/lib/permission-constants";

/**
 * Gates a route behind a specific permission key.
 * SUPER_ADMIN (the owner) bypasses this entirely — never checked
 * against RolePermission rows. All other staff must pass requireStaff
 * AND have the permission granted (or default-permissive if unset).
 *
 * NOTE: hasPermission() is async (it queries RolePermission), so this
 * function must be async and awaited too. Every route calling this now
 * needs `const auth = await requirePermission(req, KEY)`.
 */
export async function requirePermission(
  req: NextRequest,
  key: PermissionKey
): Promise<TokenPayload | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  // Shared mustChangePassword lockout — applies before any role branching,
  // so a limited (15m) token can never slip through to a real action route.
  // The dedicated /api/auth/change-password route reads the token directly
  // and never calls this guard, so it's unaffected.
  if (payload.mustChangePassword) {
    return NextResponse.json(
      { error: "Password change required" },
      { status: 403 }
    );
  }

  // Owner bypass — no permission check applies to SUPER_ADMIN
  if (payload.role === "SUPER_ADMIN") {
    return payload;
  }

  // Everyone else: must be valid staff, then must hold the permission
  const staffResult = requireStaff(req);
  if (staffResult instanceof NextResponse) {
    return staffResult;
  }

  const allowed = await hasPermission(staffResult.role, key);
  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }

  return staffResult;
}