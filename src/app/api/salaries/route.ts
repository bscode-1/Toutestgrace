import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const createSalarySchema = z.object({
  staffId: z.string().uuid().optional(),
  staffName: z.string().min(2),
  amount: z.number().positive(),
  period: z.string().min(2),
  paidAt: z.string().optional(),
});

// POST /api/salaries — record a salary payment
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "MANAGE_SALARIES");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createSalarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { staffId, staffName, amount, period, paidAt } = parsed.data;

  const salary = await prisma.salaryPayment.create({
    data: {
      staffId,
      staffName,
      amount,
      period,
      paidById: auth.id,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "SALARY",
      entityId: salary.id,
      action: "PAID",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: { staffName, amount, period },
    },
  });

  return NextResponse.json({ salary }, { status: 201 });
}

// GET /api/salaries?from=&to= — list, filterable
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_SALARIES");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.paidAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
    };
  }

  const salaries = await prisma.salaryPayment.findMany({
    where,
    orderBy: { paidAt: "desc" },
    include: { paidBy: { select: { name: true } } },
  });

  return NextResponse.json({ salaries });
}