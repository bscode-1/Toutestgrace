// src/app/api/permissions/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { PERMISSION_KEYS } from "@/lib/permission-constants";

// GET /api/permissions — full matrix (role x permission)
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_PERMISSIONS");
  if (auth instanceof NextResponse) return auth;

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
  role: z.string().min(1),
  permissionKey: z.enum(PERMISSION_KEYS),
  enabled: z.boolean(),
});

// PATCH /api/permissions — toggle one permission for one role (requires MANAGE_PERMISSIONS)
export async function PATCH(req: NextRequest) {
  const auth = requirePermission(req, "MANAGE_PERMISSIONS");
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
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: { role, permissionKey },
    },
  });

  return NextResponse.json({ permission });
}