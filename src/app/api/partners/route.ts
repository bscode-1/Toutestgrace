import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const createPartnerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
});

// POST /api/partners — create a partner
// Partners are a standalone model now — no login credentials, no password hash,
// no role string. Just contact info tied back to the actor who created them.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "MANAGE_PARTNERS");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createPartnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, phone } = parsed.data;

  const partner = await prisma.partner.create({
    data: {
      name,
      email,
      phone,
      createdById: auth.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "PARTNER",
      entityId: partner.id,
      action: "CREATED",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: { name, email, phone },
    },
  });

  return NextResponse.json({ partner }, { status: 201 });
}

// GET /api/partners — list all partners
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_PARTNERS");
  if (auth instanceof NextResponse) return auth;

  const partners = await prisma.partner.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ partners });
}