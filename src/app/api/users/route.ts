import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().min(2),
  branchId: z.string().uuid(),
  preferredLanguage: z.enum(["en", "fr"]).default("en"),
});

// POST /api/users — create a teller or branch manager (super admin only)
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_ROLES");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, role, branchId, preferredLanguage } = parsed.data;

  const roleExists = await prisma.role.findUnique({ where: { name: role } });
  if (!roleExists) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.appUser.create({
    data: { name, email, passwordHash, role, branchId, preferredLanguage },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "APP_USER",
      entityId: user.id,
      action: "CREATED",
      performedByAdminId: auth.id,
      metadata: { name, email, role, branchId },
    },
  });

  const { passwordHash: _omit, ...safeUser } = user;
  return NextResponse.json({ user: safeUser }, { status: 201 });
}

// GET /api/users — list all staff (super admin only)
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "MANAGE_PERMISSIONS");
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.appUser.findMany({
    include: { branch: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const safeUsers = users.map(({ passwordHash, ...u }) => u);
  return NextResponse.json({ users: safeUsers });
}