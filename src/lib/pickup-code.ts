import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Generates a random 16-digit numeric pickup code, retrying on the
 * rare chance of a collision with an existing transaction.
 */
export async function generatePickupCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from({ length: 16 }, () => crypto.randomInt(0, 10)).join("");

    const existing = await prisma.transaction.findUnique({ where: { pickupCode: code } });
    if (!existing) return code;
  }

  throw new Error("Failed to generate a unique pickup code after 5 attempts");
}

/**
 * Builds the QR code payload string. The actual QR image is rendered
 * client-side (e.g. on the receipt) from this string.
 */
export function buildQrPayload(pickupCode: string, transactionId: string): string {
  return JSON.stringify({ pickupCode, transactionId });
}