import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: {
      manager: { select: { name: true, email: true } },
      currency: { select: { code: true, symbol: true } },
    },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json({ branch });
}


const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  branchCode: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

// PATCH /api/branches/:branchId — edit details, or deactivate/reactivate (super admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;
  const body = await req.json();
  const parsed = updateBranchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!existing) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // Re-activating still requires a manager — same rule as the initial creation flow
  if (parsed.data.status === "ACTIVE" && !existing.managerId) {
    return NextResponse.json(
      { error: "Cannot activate: assign a manager to this branch first" },
      { status: 400 }
    );
  }

  const branch = await prisma.branch.update({
    where: { id: branchId },
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      entityType: "BRANCH",
      entityId: branchId,
      action: parsed.data.status ? `STATUS_CHANGED_TO_${parsed.data.status}` : "UPDATED",
      performedByAdminId: auth.id,
      metadata: parsed.data,
    },
  });

  return NextResponse.json({ branch });
}

// DELETE /api/branches/:branchId — only allowed if the branch has zero
// dependent records (no transactions, topups, staff, or ledger history)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;

  const [txCount, topupCount, staffCount, ledgerCount] = await Promise.all([
    prisma.transaction.count({
      where: { OR: [{ senderBranchId: branchId }, { receiverBranchId: branchId }] },
    }),
    prisma.topup.count({ where: { branchId } }),
    prisma.appUser.count({ where: { branchId } }),
    prisma.generalLedgerEntry.count({ where: { branchId } }),
  ]);

  if (txCount > 0 || topupCount > 0 || staffCount > 0 || ledgerCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: this branch has ${txCount} transaction(s), ${topupCount} topup(s), ${staffCount} staff member(s), and ${ledgerCount} ledger entry(ies) tied to it. Deactivate it instead.`,
      },
      { status: 400 }
    );
  }

  // Safe to remove — clean up its (empty) commission tiers first, then the branch itself
  await prisma.commissionTier.deleteMany({ where: { branchId } });
  await prisma.branch.delete({ where: { id: branchId } });

  await prisma.auditLog.create({
    data: {
      entityType: "BRANCH",
      entityId: branchId,
      action: "DELETED",
      performedByAdminId: auth.id,
      metadata: {},
    },
  });

  return NextResponse.json({ success: true });
}

