import { prisma } from "@/lib/prisma";
type Db = Pick<typeof prisma, "tellerLedgerEntry">;


export type TellerLedgerType =
  | "DEPOSIT_COLLECTED"
  | "WITHDRAWAL_PAID"
  | "REFUND_PAID"
  | "MANAGER_FUNDING"
  | "TELLER_RETURN";

// credits increase teller cash, debits reduce it (amounts are stored positive)
const CREDIT: TellerLedgerType[] = ["DEPOSIT_COLLECTED", "MANAGER_FUNDING"];
const DEBIT: TellerLedgerType[] = ["WITHDRAWAL_PAID", "REFUND_PAID", "TELLER_RETURN"];

export async function recordTellerLedgerEntry(
  args: {
    tellerId: string;
    type: TellerLedgerType;
    amount: number;
    refType?: string | null;
    refId?: string | null;
    givenById?: string | null;
  },
  db: Db | typeof prisma = prisma
) {
  return db.tellerLedgerEntry.create({
    data: {
      tellerId: args.tellerId,
      type: args.type as any,
      amount: args.amount,
      refType: args.refType ?? null,
      refId: args.refId ?? null,
      givenById: args.givenById ?? null,
    },
  });
}

export async function getTellerBalance(tellerId: string): Promise<number> {
  const rows = await prisma.tellerLedgerEntry.groupBy({
    by: ["type"],
    where: { tellerId },
    _sum: { amount: true },
  });
  let balance = 0;
  for (const r of rows) {
    const sum = Number(r._sum.amount ?? 0);
    if (CREDIT.includes(r.type as TellerLedgerType)) balance += sum;
    else if (DEBIT.includes(r.type as TellerLedgerType)) balance -= sum;
  }
  return balance;
}

export async function assertTellerCanPay(tellerId: string, amount: number) {
  const balance = Number(await getTellerBalance(tellerId));
  if (balance < amount) {
    throw new Error(
      `Insufficient teller balance (available ${balance.toFixed(2)}, needed ${amount.toFixed(2)}). Ask your branch manager for funding.`
    );
  }
}

export async function assertTellerCanDeactivate(userId: string) {
  const u = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { role: true, name: true },
  });
  if (!u || u.role !== "TELLER") return;

  const raw: any = await getTellerBalance(userId);
  const bal =
    Number(typeof raw === "object" && raw !== null ? raw.balance ?? 0 : raw) || 0;

  if (Math.abs(bal) > 0.005) {
    const e: any = new Error(
      `Cannot deactivate ${u.name}: the teller still holds $${bal.toFixed(2)}. The balance must be 0 first (collect the cash back from the Team page).`
    );
    e.code = "TELLER_HAS_BALANCE";
    throw e;
  }
}