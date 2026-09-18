// src/app/api/roles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const SYSTEM_ROLES = [
  { name: "BRANCH_MANAGER", displayName: "Branch Manager" },
  { name: "TELLER", displayName: "Teller" },
];

// GET /api/roles — list all roles, seeding the two built-in ones if missing
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_ROLES");
  if (auth instanceof NextResponse) return auth;

  for (const r of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name, isSystem: true },
    });
  }

  const roles = await prisma.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] });
  return NextResponse.json({ roles });
}

const createRoleSchema = z.object({
  name: z.string().min(2).max(40),
});

// POST /api/roles — create a new custom role (requires MANAGE_ROLES)
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "MANAGE_ROLES");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const key = parsed.data.name.trim().toUpperCase().replace(/\s+/g, "_");

  const existing = await prisma.role.findUnique({ where: { name: key } });
  if (existing) {
    return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });
  }

  const role = await prisma.role.create({
    data: { name: key, isSystem: false },
  });

  // ⚠️ ASSUMPTION pending confirmation: AuditLog has both performedByAdminId
  // and performedByUserId as separate nullable FKs; branch on actor type.
  await prisma.auditLog.create({
    data: {
      entityType: "ROLE",
      entityId: role.id,
      action: "CREATED",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: { name: key },
    },
  });

  return NextResponse.json({ role }, { status: 201 });
}