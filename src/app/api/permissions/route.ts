import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { PERMISSION_KEYS } from "@/lib/permissions";

// GET /api/permissions — full matrix (role x permission), creating any
// missing rows as enabled=true so the grid is always complete
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  // Pull the ACTUAL current list of roles (built-in + any custom ones the
  // super admin has created) instead of a hardcoded two-role list.
  const allRoles = await prisma.role.findMany();

  const existing = await prisma.rolePermission.findMany();
  const existingKeys = new Set(existing.map((r) => `${r.role}:${r.permissionKey}`));

    const missing: { role: string; permissionKey: string; enabled: boolean }[] = [];
  for (const role of allRoles) {
    for (const key of PERMISSION_KEYS) {
      if (!existingKeys.has(`${role.name}:${key}`)) {
        missing.push({ role: role.name, permissionKey: key, enabled: true });
      }
    }
  }

  if (missing.length > 0) {
    await prisma.rolePermission.createMany({ data: missing, skipDuplicates: true });
  }

  const permissions = await prisma.rolePermission.findMany({
    orderBy: [{ role: "asc" }, { permissionKey: "asc" }],
  });

  return NextResponse.json({ permissions });
}

const toggleSchema = z.object({
  role: z.string().min(1), // any role name — built-in or custom
  permissionKey: z.enum(PERMISSION_KEYS),
  enabled: z.boolean(),
});

// PATCH /api/permissions — toggle one permission for one role (super admin only)
export async function PATCH(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { role, permissionKey, enabled } = parsed.data;

  const permission = await prisma.rolePermission.upsert({
    where: { role_permissionKey: { role, permissionKey } },
    update: { enabled },
    create: { role, permissionKey, enabled },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "PERMISSION",
      entityId: permission.id,
      action: enabled ? "ENABLED" : "DISABLED",
      performedByAdminId: auth.id,
      metadata: { role, permissionKey },
    },
  });

  return NextResponse.json({ permission });
}