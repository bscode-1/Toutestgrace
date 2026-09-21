import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.mustChangePassword) {
    return NextResponse.json(
      { error: "Use the forced password reset flow instead" },
      { status: 403 }
    );
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "newPassword must be at least 8 characters" },
      { status: 400 }
    );
  }

  const isSuperAdmin = payload.role === "SUPER_ADMIN";

  if (isSuperAdmin) {
    const admin = await prisma.superAdmin.findUnique({ where: { id: payload.id } });
    if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await prisma.auditLog.create({
      data: {
        entityType: "SUPER_ADMIN",
        entityId: admin.id,
        action: "PASSWORD_CHANGED",
        performedByAdminId: admin.id,
      },
    });
  } else {
    const user = await prisma.appUser.findUnique({ where: { id: payload.id } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    await prisma.appUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await prisma.auditLog.create({
      data: {
        entityType: "APP_USER",
        entityId: user.id,
        action: "PASSWORD_CHANGED",
        performedByUserId: user.id,
      },
    });
  }

  return NextResponse.json({ success: true });
  
}