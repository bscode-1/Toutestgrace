import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const createBranchSchema = z.object({
  name: z.string().min(2),
  location: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  branchCode: z.string().optional(),
  defaultLanguage: z.enum(["en", "fr"]).default("en"),
  currencyId: z.string().uuid().optional(),
});

// POST /api/branches — create a new branch (super admin only)
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_ROLES");
  if (auth instanceof NextResponse) return auth; // unauthorized

  const body = await req.json();
  const parsed = createBranchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, location, address, phone, branchCode, defaultLanguage, currencyId } = parsed.data;

  // Branch is created INACTIVE by default — cannot go ACTIVE until a
  // manager is assigned (enforced again at the assign-manager step).
  const branch = await prisma.branch.create({
    data: {
      name,
      location,
      address,
      phone,
      branchCode,
      defaultLanguage,
      currencyId,
      status: "INACTIVE",
      createdBySuperAdminId: auth.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "BRANCH",
      entityId: branch.id,
      action: "CREATED",
      performedByAdminId: auth.id,
      metadata: { name, location },
    },
  });

  return NextResponse.json({ branch }, { status: 201 });
}

// GET /api/branches — list all branches (super admin only, for now)
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "MANAGE_PERMISSIONS");
  if (auth instanceof NextResponse) return auth;

  const branches = await prisma.branch.findMany({
    include: { manager: true, currency: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ branches });
}