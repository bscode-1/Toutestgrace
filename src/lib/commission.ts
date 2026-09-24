import { prisma } from "@/lib/prisma";

export type CommissionMode = "DEDUCTED" | "PAID_BY_SENDER";

/**
 * Finds the active commission tier for a given branch and amount,
 * then calculates the commission, the amount payable to the receiver,
 * and the total the sender must pay at the counter — depending on
 * whether the commission is deducted from the sent amount or paid
 * separately by the sender.
 */
export async function calculateCommission(
  branchId: string,
  amountSent: number,
  commissionMode: CommissionMode = "DEDUCTED"
) {
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

  let amountPayable: number;
  let totalCharged: number;

  if (commissionMode === "PAID_BY_SENDER") {
    amountPayable = amountSent;
    totalCharged = Math.round((amountSent + commissionAmount) * 100) / 100;
  } else {
    amountPayable = Math.round((amountSent - commissionAmount) * 100) / 100;
    totalCharged = amountSent;
  }

  return { tier, commissionAmount, amountPayable, totalCharged };
}