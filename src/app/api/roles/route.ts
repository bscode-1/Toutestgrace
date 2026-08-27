import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const SYSTEM_ROLES = [
  { name: "BRANCH_MANAGER", displayName: "Branch Manager" },
  { name: "TELLER", displayName: "Teller" },
];

// GET /api/roles — list all roles, seeding the two built-in ones if missing
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
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

// POST /api/roles — create a new custom role (super admin only)
export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Normalize to a stable key: "Cashier" -> "CASHIER", "Front Desk" -> "FRONT_DESK"
  const key = parsed.data.name.trim().toUpperCase().replace(/\s+/g, "_");

  const existing = await prisma.role.findUnique({ where: { name: key } });
  if (existing) {
    return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });
  }

  const role = await prisma.role.create({
    data: { name: key, isSystem: false },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "ROLE",
      entityId: role.id,
      action: "CREATED",
      performedByAdminId: auth.id,
      metadata: { name: key },
    },
  });

  return NextResponse.json({ role }, { status: 201 });
}