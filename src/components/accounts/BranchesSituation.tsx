"use client";

import type { BranchSituation } from "@/lib/branch-accounts";

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COLS: { key: keyof BranchSituation; label: string; current?: boolean }[] = [
  { key: "partnerReceived", label: "Partner Cash In" },
  { key: "capitalReturned", label: "Capital Returned" },
  { key: "deposits", label: "Deposits" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "refunds", label: "Refunds" },
  { key: "commission", label: "Commission" },
  { key: "expenses", label: "Expenses" },
  { key: "salaries", label: "Salaries" },
  { key: "netProfit", label: "Net Profit" },
  { key: "managerCash", label: "Manager Cash", current: true },
  { key: "tellerCash", label: "Tellers Cash", current: true },
  { key: "cashOnHand", label: "Cash On Hand", current: true },
  { key: "cashToReturn", label: "Cash To Return", current: true },
];

export default function BranchesSituation({
  rows,
  loading,
  error,
  periodLabel,
}: {
  rows: BranchSituation[];
  loading: boolean;
  error: string | null;
  periodLabel: string;
}) {
  const total = (k: keyof BranchSituation) =>
    rows.reduce((a, r) => a + Number(r[k] as number), 0);

  const cards = [
    { label: "Commission (period)", value: total("commission") },
    { label: "Net Profit (period)", value: total("netProfit") },
    { label: "Cash On Hand (now)", value: total("cashOnHand") },
    { label: "Cash To Return (now)", value: total("cashToReturn") },
  ];

  return (
    <div className="mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Branches Situation
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Period: {periodLabel}. Cash columns (marked *) are current balances.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading branches...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className="card-hover rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">{c.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {fmt(c.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-4 py-3 dark:bg-slate-900">Branch</th>
                  <th className="px-4 py-3">Status</th>
                  {COLS.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3 text-right">
                      {c.label}
                      {c.current ? " *" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {rows.map((r) => (
                  <tr key={r.branchId}>
                    <td className="sticky left-0 bg-white px-4 py-3 font-medium dark:bg-slate-800">
                      {r.name}
                    </td>
                    <td className="px-4 py-3">{r.status}</td>
                    {COLS.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-3 text-right tabular-nums ${
                          c.key === "netProfit"
                            ? Number(r[c.key]) < 0
                              ? "text-red-600"
                              : "text-emerald-600"
                            : ""
                        }`}
                      >
                        {fmt(Number(r[c.key]))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold dark:bg-slate-900">
                  <td className="sticky left-0 bg-slate-50 px-4 py-3 dark:bg-slate-900">
                    All Branches
                  </td>
                  <td className="px-4 py-3" />
                  {COLS.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-right tabular-nums">
                      {fmt(total(c.key))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}