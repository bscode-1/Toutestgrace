import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { hashPassword } from "@/lib/auth";
import { generateTempPassword } from "@/lib/temp-password";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requirePermission(req, "RESET_STAFF_PASSWORD");
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.appUser.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "APP_USER",
      entityId: userId,
      action: "PASSWORD_RESET",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role !== "SUPER_ADMIN" ? auth.id : undefined,
      metadata: { resetForUserId: userId },
    },
  });

  return NextResponse.json({ tempPassword });
}