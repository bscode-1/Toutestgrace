import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["TELLER", "BRANCH_MANAGER"]),
  branchId: z.string().uuid(),
  preferredLanguage: z.enum(["en", "fr"]).default("en"),
});

// POST /api/users — create a teller or branch manager (super admin only)
export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, role, branchId, preferredLanguage } = parsed.data;

  // Confirm the branch actually exists before attaching a user to it
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

  // Never return the password hash to the client
  const { passwordHash: _omit, ...safeUser } = user;
  return NextResponse.json({ user: safeUser }, { status: 201 });
}

// GET /api/users — list all staff (super admin only)
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.appUser.findMany({
    include: { branch: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const safeUsers = users.map(({ passwordHash, ...u }) => u);
  return NextResponse.json({ users: safeUsers });
}

