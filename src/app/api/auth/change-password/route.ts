import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const payload = verifyToken(authHeader.replace("Bearer ", ""));
  if (!payload || !payload.mustChangePassword) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { newPassword } = await req.json();
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.appUser.update({
    where: { id: payload.id },
    data: { passwordHash, mustChangePassword: false },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "APP_USER",
      entityId: payload.id,
      action: "PASSWORD_CHANGED",
      performedByUserId: payload.id,
    },
  });

  const freshToken = signToken({
    id: payload.id,
    role: payload.role as "TELLER" | "BRANCH_MANAGER",
    branchId: payload.branchId,
  });

  return NextResponse.json({ token: freshToken });
}