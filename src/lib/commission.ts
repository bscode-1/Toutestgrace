import { prisma } from "@/lib/prisma";

/**
 * Finds the active commission tier for a given branch and amount,
 * then calculates the commission and payable amount — supporting
 * either a PERCENTAGE tier or a FLAT fee tier.
 */
export async function calculateCommission(branchId: string, amountSent: number) {
  const tier = await prisma.commissionTier.findFirst({
    where: {
      branchId,
      minAmount: { lte: amountSent },
      maxAmount: { gte: amountSent },
      activeTo: null,
    },
  });

  if (!tier) {
    throw new Error(
      `No active commission tier found for branch ${branchId} at amount ${amountSent}`
    );
  }

  let commissionAmount: number;

  if (tier.commissionType === "FLAT") {
    if (tier.commissionFlatAmount === null) {
      throw new Error(`Commission tier ${tier.id} is FLAT but has no flat amount configured`);
    }
    commissionAmount = Number(tier.commissionFlatAmount);
  } else {
    if (tier.commissionPercent === null) {
      throw new Error(`Commission tier ${tier.id} is PERCENTAGE but has no percent configured`);
    }
    commissionAmount = Math.round(amountSent * (Number(tier.commissionPercent) / 100) * 100) / 100;
  }

  const amountPayable = Math.round((amountSent - commissionAmount) * 100) / 100;

  return { tier, commissionAmount, amountPayable };
}