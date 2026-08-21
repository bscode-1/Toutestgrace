import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/transactions/:id — full detail for one transaction (staff: must belong
// to sender or receiver branch; super admin: any)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      senderBranch: {
        select: { name: true, address: true, phone: true, branchCode: true, location: true },
      },
      receiverBranch: {
        select: { name: true, address: true, phone: true, branchCode: true, location: true },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const isSuperAdmin = payload.role === "SUPER_ADMIN";
  const isStaffOnThisTransaction =
    payload.branchId === transaction.senderBranchId || payload.branchId === transaction.receiverBranchId;

  if (!isSuperAdmin && !isStaffOnThisTransaction) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ transaction });
}
