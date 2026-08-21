import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/dashboard/trend — last 7 days of sent vs completed volume
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const isSuperAdmin = payload.role === "SUPER_ADMIN";
  const isStaff = payload.role === "TELLER" || payload.role === "BRANCH_MANAGER";
  if (!isSuperAdmin && !isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const branchId = isStaff ? payload.branchId : undefined;

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: since },
      ...(branchId ? { senderBranchId: branchId } : {}),
    },
    select: { createdAt: true, amountSent: true, status: true },
  });

  const days: { label: string; sent: number; completed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString("en-US", { weekday: "short" }), sent: 0, completed: 0 });
  }

  transactions.forEach((tx) => {
    const dayIndex = 6 - Math.floor((Date.now() - tx.createdAt.getTime()) / 86400000);
    if (dayIndex < 0 || dayIndex > 6) return;
    days[dayIndex].sent += Number(tx.amountSent);
    if (tx.status === "COMPLETED") days[dayIndex].completed += Number(tx.amountSent);
  });

  return NextResponse.json({ days });
}