import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const DEFAULT_CATEGORIES = ["RENT", "UTILITIES", "BILLS", "SUPPLIES", "MAINTENANCE", "OTHER"];

// GET /api/expense-categories — list, seeding defaults if empty
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_EXPENSES");
  if (auth instanceof NextResponse) return auth;

  const count = await prisma.expenseCategory.count();
  if (count === 0) {
    await prisma.expenseCategory.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name })),
      skipDuplicates: true,
    });
  }

  const categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ categories });
}

const createSchema = z.object({ name: z.string().min(2).max(40) });

// POST /api/expense-categories — add a new category
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "MANAGE_EXPENSE_CATEGORIES");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const key = parsed.data.name.trim().toUpperCase().replace(/\s+/g, "_");

  const existing = await prisma.expenseCategory.findUnique({ where: { name: key } });
  if (existing) {
    return NextResponse.json({ error: "This category already exists" }, { status: 400 });
  }

  const category = await prisma.expenseCategory.create({ data: { name: key } });
  return NextResponse.json({ category }, { status: 201 });
}