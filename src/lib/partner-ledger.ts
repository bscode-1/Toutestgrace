import { prisma } from "@/lib/prisma";

export type PartnerLedgerRow = {
  id: string;
  type: "CASH_IN" | "CASH_OUT";
  source: "FUND_SOURCE" | "CAPITAL_RETURN" | "DISTRIBUTION";
  date: Date;
  amount: number;
  branchName?: string | null;
  code?: string | null;
  notes?: string | null;
};

export async function buildPartnerLedger(partnerId: string) {
  const [fundSources, distributions, returns] = await Promise.all([
    prisma.fundSource.findMany({ where: { partnerId } }),
    prisma.partnerDistribution.findMany({
      where: { partnerId },
      include: { branch: { select: { name: true } }, fundSource: { select: { code: true } } },
    }),
    prisma.branchCapitalReturn.findMany({
      where: { partnerId },
      include: { branch: { select: { name: true } } },
    }),
  ]);

  const rows: PartnerLedgerRow[] = [
    ...fundSources.map((f) => ({
      id: f.id,
      type: "CASH_IN" as const,
      source: "FUND_SOURCE" as const,
      date: f.recordedAt,
      amount: Number(f.cashValue),
      code: f.code,
      notes: f.commodityName,
    })),
    ...returns.map((r) => ({
      id: r.id,
      type: "CASH_IN" as const,
      source: "CAPITAL_RETURN" as const,
      date: r.recordedAt,
      amount: Number(r.amount),
      branchName: r.branch?.name ?? null,
    })),
    ...distributions.map((d) => ({
      id: d.id,
      type: "CASH_OUT" as const,
      source: "DISTRIBUTION" as const,
      date: d.createdAt ?? (d as any).recordedAt,
      amount: Number(d.amount),
      branchName: d.branch?.name ?? null,
      code: d.fundSource?.code ?? null,
    })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)); // newest first

  const totalIn = rows.filter((r) => r.type === "CASH_IN").reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.type === "CASH_OUT").reduce((s, r) => s + r.amount, 0);

  return { rows, totalIn, totalOut, balance: totalIn - totalOut };
}