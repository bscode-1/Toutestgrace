import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

// Unambiguous character set (no 0/O, 1/I/L confusion)
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomSegment(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

/**
 * Generates a unique, human-readable code for a FundSource (cash-in), e.g. "CI-7K2M9P".
 * Retries on the rare collision.
 */
export async function generateFundSourceCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `CI-${randomSegment(6)}`;
    const existing = await prisma.fundSource.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique fund source code after 10 attempts");
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "MANAGE_FUND_SOURCES");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { partnerId, commodityName, cashValue, description } = body;

    if (!partnerId || !commodityName || cashValue === undefined || cashValue === null) {
      return NextResponse.json(
        { error: "partnerId, commodityName, and cashValue are required" },
        { status: 400 }
      );
    }

    const numericCashValue = Number(cashValue);
    if (isNaN(numericCashValue) || numericCashValue <= 0) {
      return NextResponse.json(
        { error: "cashValue must be a positive number" },
        { status: 400 }
      );
    }

    const code = await generateFundSourceCode();

    const fundSource = await prisma.fundSource.create({
      data: {
        partnerId,
        commodityName,
        cashValue: numericCashValue,
        description: description || null,
        recordedById: auth.id,
        code,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "FUND_SOURCE",
        entityId: fundSource.id,
        action: "CREATED",
        performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
        performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
        metadata: { partnerId, commodityName, cashValue: numericCashValue },
      },
    });

    return NextResponse.json({ fundSource }, { status: 201 });
  } catch (err) {
    console.error("Error creating fund source:", err);
    return NextResponse.json(
      { error: "Failed to record cash in" },
      { status: 500 }
    );
  }
}