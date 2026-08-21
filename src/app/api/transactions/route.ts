import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { calculateCommission } from "@/lib/commission";
import { generatePickupCode, buildQrPayload } from "@/lib/pickup-code";

const createTransactionSchema = z.object({
  receiverBranchId: z.string().uuid(),
  senderName: z.string().min(2),
  senderIdNumber: z.string().optional(),
  receiverName: z.string().min(2),
  amountSent: z.number().positive(),
  currencyId: z.string().uuid().optional(),
});

// POST /api/transactions — create a new send (staff only, from their own branch)
export async function POST(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { receiverBranchId, senderName, senderIdNumber, receiverName, amountSent, currencyId } =
    parsed.data;

  const senderBranchId = auth.branchId as string;

  if (senderBranchId === receiverBranchId) {
    return NextResponse.json(
      { error: "Sender and receiver branch must be different" },
      { status: 400 }
    );
  }

  const [senderBranch, receiverBranch] = await Promise.all([
    prisma.branch.findUnique({ where: { id: senderBranchId } }),
    prisma.branch.findUnique({ where: { id: receiverBranchId } }),
  ]);

  if (!senderBranch || senderBranch.status !== "ACTIVE") {
    return NextResponse.json({ error: "Sender branch is not active" }, { status: 400 });
  }
  if (!receiverBranch || receiverBranch.status !== "ACTIVE") {
    return NextResponse.json({ error: "Receiver branch is not active" }, { status: 400 });
  }

  let commissionResult;
  try {
    commissionResult = await calculateCommission(senderBranchId, amountSent);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const { tier, commissionAmount, amountPayable } = commissionResult;

  const pickupCode = await generatePickupCode();

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        senderBranchId,
        receiverBranchId,
        senderName,
        senderIdNumber,
        receiverName,
        amountSent,
        commissionAmount,
        amountPayable,
        currencyId,
        commissionTierId: tier.id,
        pickupCode,
        status: "PENDING",
        createdById: auth.id,
      },
    });

    const qrCodeData = buildQrPayload(pickupCode, transaction.id);
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { qrCodeData },
    });

    await tx.subLedgerEntry.create({
      data: {
        branchId: senderBranchId,
        transactionId: transaction.id,
        entryType: "PENDING_IN",
        amount: amountSent,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "TRANSACTION",
        entityId: transaction.id,
        action: "CREATED",
        performedByUserId: auth.id,
        metadata: { amountSent, commissionAmount, pickupCode, receiverBranchId },
      },
    });

    return { ...transaction, qrCodeData };
  });

  return NextResponse.json({ transaction: result }, { status: 201 });
}

// GET /api/transactions — filterable list (staff: own branch, super admin: all)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const { verifyToken } = await import("@/lib/auth");
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const isSuperAdmin = payload.role === "SUPER_ADMIN";
  const isStaff = payload.role === "TELLER" || payload.role === "BRANCH_MANAGER";
  if (!isSuperAdmin && !isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const status = searchParams.get("status"); // PENDING | COMPLETED | REFUNDED
  const branchId = searchParams.get("branchId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");

  const scopedBranchId = isStaff ? payload.branchId : branchId || undefined;

  const where: Record<string, unknown> = {};

  if (scopedBranchId) {
    where.OR = [{ senderBranchId: scopedBranchId }, { receiverBranchId: scopedBranchId }];
  }
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (search) {
    where.AND = [
      {
        OR: [
          { pickupCode: { contains: search } },
          { senderName: { contains: search, mode: "insensitive" } },
          { receiverName: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      senderBranch: { select: { name: true } },
      receiverBranch: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ transactions });
}