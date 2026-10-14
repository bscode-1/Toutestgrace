import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type Allocation = {
  branchName: string;
  amount: number;
  distributedAt: string;
  note: string | null;
};

type LedgerEntry = {
  id: string;
  type: "CASH_IN" | "CASH_OUT";
  source?: "FUND_SOURCE" | "CAPITAL_RETURN"; // CASH_IN only
  date: string;
  cashIn: number;
  cashOut: number;
  runningBalance: number;
  // CASH_IN only:
  code?: string;
  commodityName?: string;
  description?: string;
  remainingBalance?: number;
  allocations?: Allocation[];
  // CASH_OUT only:
  branchName?: string;
  note?: string;
  // both:
  recordedByName?: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Partners have no login/session, so only super admin can ever reach this.
  if (payload.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { partnerId } = await params;

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const [fundSources, distributions, capitalReturns] = await Promise.all([
    prisma.fundSource.findMany({
      where: { partnerId },
      orderBy: { recordedAt: "asc" },
      include: {
        recordedBy: { select: { name: true } },
        recordedByUser: { select: { name: true } },
      },
    }),
    prisma.partnerDistribution.findMany({
      where: { partnerId },
      orderBy: { distributedAt: "asc" },
      include: {
        branch: { select: { name: true } },
        recordedBy: { select: { name: true } },
        recordedByUser: { select: { name: true } },
      },
    }),
    prisma.branchCapitalReturn.findMany({
      where: { partnerId },
      orderBy: { recordedAt: "asc" },
      include: { branch: { select: { name: true } } },
    }),
  ]);

  // BranchCapitalReturn.recordedById is a plain string (no relation) → look up names
  const returnUserIds = [...new Set(capitalReturns.map((r) => r.recordedById))];
  const returnUsers = returnUserIds.length
    ? await prisma.appUser.findMany({
        where: { id: { in: returnUserIds } },
        select: { id: true, name: true },
      })
    : [];
  const returnUserName = new Map(returnUsers.map((u) => [u.id, u.name]));

  const totalFundSources = fundSources.reduce((sum, fs) => sum + Number(fs.cashValue), 0);
  const totalReturned = capitalReturns.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalCashIn = totalFundSources + totalReturned;
  const totalCashOut = distributions.reduce((sum, d) => sum + Number(d.amount), 0);
  const balance = totalCashIn - totalCashOut;

   const returnedUsed = distributions
    .filter((d) => !d.fundSourceId)
    .reduce((sum, d) => sum + Number(d.amount), 0);
  const returnedAvailable = totalReturned - returnedUsed;

  // --- Direct allocation: each distribution targets one specific fund source ---
  const buckets = new Map(
    fundSources.map((fs) => [
      fs.id,
      { remaining: Number(fs.cashValue), allocations: [] as Allocation[] },
    ])
  );

  for (const d of distributions) {
    if (!d.fundSourceId) continue; // paid from returned capital, tracked via returnedUsed
    const bucket = buckets.get(d.fundSourceId);
    if (!bucket) continue;
    bucket.allocations.push({
      branchName: d.branch.name,
      amount: Number(d.amount),
      distributedAt: d.distributedAt.toISOString(),
      note: d.note,
    });
    bucket.remaining -= Number(d.amount);
  }

 for (const d of distributions) {
  const bucket = buckets.get(d.fundSourceId ?? "RETURNED");
  if (!bucket) continue;
  bucket.allocations.push({
    branchName: d.branch.name,
    amount: Number(d.amount),
    distributedAt: d.distributedAt.toISOString(),
    note: d.note,
  });
  bucket.remaining -= Number(d.amount);
}

  // --- Merge into one chronological ledger with a running balance ---
  type RawEvent =
    | {
        kind: "IN";
        date: Date;
        id: string;
        amount: number;
        code: string;
        commodityName: string;
        description: string | null;
        recordedByName: string;
      }
    | {
        kind: "RETURN";
        date: Date;
        id: string;
        amount: number;
        branchName: string;
        recordedByName: string;
      }
    | {
        kind: "OUT";
        date: Date;
        id: string;
        amount: number;
        branchName: string;
        note: string | null;
        recordedByName: string;
      };

  const rawEvents: RawEvent[] = [
    ...fundSources.map(
      (fs): RawEvent => ({
        kind: "IN",
        date: fs.recordedAt,
        id: fs.id,
        amount: Number(fs.cashValue),
        code: fs.code,
        commodityName: fs.commodityName,
        description: fs.description,
        recordedByName: fs.recordedBy?.name ?? fs.recordedByUser?.name ?? "—",
      })
    ),
    ...capitalReturns.map(
      (r): RawEvent => ({
        kind: "RETURN",
        date: r.recordedAt,
        id: r.id,
        amount: Number(r.amount),
        branchName: r.branch?.name ?? "—",
        recordedByName: returnUserName.get(r.recordedById) ?? "—",
      })
    ),
    ...distributions.map(
      (d): RawEvent => ({
        kind: "OUT",
        date: d.distributedAt,
        id: d.id,
        amount: Number(d.amount),
        branchName: d.branch.name,
        note: d.note,
        recordedByName: d.recordedBy?.name ?? d.recordedByUser?.name ?? "—",
      })
    ),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const ledgerAsc: LedgerEntry[] = rawEvents.map((ev) => {
    if (ev.kind === "IN") {
      running += ev.amount;
      const bucket = buckets.get(ev.id)!;
      return {
        id: ev.id,
        type: "CASH_IN",
        source: "FUND_SOURCE",
        date: ev.date.toISOString(),
        cashIn: ev.amount,
        cashOut: 0,
        runningBalance: running,
        code: ev.code,
        commodityName: ev.commodityName,
        description: ev.description ?? undefined,
        recordedByName: ev.recordedByName,
        remainingBalance: bucket.remaining,
        allocations: bucket.allocations,
      };
    }
    if (ev.kind === "RETURN") {
      running += ev.amount;
      return {
        id: ev.id,
        type: "CASH_IN",
        source: "CAPITAL_RETURN",
        date: ev.date.toISOString(),
        cashIn: ev.amount,
        cashOut: 0,
        runningBalance: running,
        code: "RETURN",
        commodityName: "Capital return",
        description: `Returned by ${ev.branchName}`,
        recordedByName: ev.recordedByName,
        remainingBalance: ev.amount,
        allocations: [],
      };
    }
    running -= ev.amount;
    return {
      id: ev.id,
      type: "CASH_OUT",
      date: ev.date.toISOString(),
      cashIn: 0,
      cashOut: ev.amount,
      runningBalance: running,
      branchName: ev.branchName,
      note: ev.note ?? undefined,
      recordedByName: ev.recordedByName,
    };
  });

  const ledger = [...ledgerAsc].reverse(); // newest first for display

    const availableSources = [
    ...fundSources
      .map((fs) => ({
        id: fs.id,
        code: fs.code,
        commodityName: fs.commodityName,
        remaining: buckets.get(fs.id)!.remaining,
      }))
      .filter((s) => s.remaining > 0),
    ...(returnedAvailable > 0.005
      ? [
          {
            id: "RETURNED",
            code: "RETURNED",
            commodityName: "Returned capital",
            remaining: returnedAvailable,
          },
        ]
      : []),
  ];

  return NextResponse.json({
    partner,
    balance,
    totalCashIn,
    totalCashOut,
    totalReturned,
    ledger,
    availableSources,
  });
}