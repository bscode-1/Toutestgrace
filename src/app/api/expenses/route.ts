import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const createExpenseSchema = z.object({
  branchId: z.string().uuid().optional(),
  category: z.string().min(2),
  description: z.string().optional(),
  amount: z.number().positive(),
  paidAt: z.string().optional(), // ISO date, defaults to now
});

// POST /api/expenses — record a paid expense (super admin only)
export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { branchId, category, description, amount, paidAt } = parsed.data;

  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
  }

  const expense = await prisma.expense.create({
    data: {
      branchId,
      category,
      description,
      amount,
      paidById: auth.id,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "EXPENSE",
      entityId: expense.id,
      action: "CREATED",
      performedByAdminId: auth.id,
      metadata: { category, amount, branchId },
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}

// GET /api/expenses?category=&from=&to=&branchId= — list, filterable (super admin only)
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const branchId = searchParams.get("branchId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (branchId) where.branchId = branchId;
  if (from || to) {
    where.paidAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
    };
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { paidAt: "desc" },
    include: {
      branch: { select: { name: true } },
      paidBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ expenses });
}