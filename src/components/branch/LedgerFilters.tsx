"use client";

import { ReactNode, useMemo, useState } from "react";

export const LEDGER_LABELS: Record<string, string> = {
  DEPOSIT_COLLECTED: "Deposit collected",
  MANAGER_FUNDING: "Manager funding",
  WITHDRAWAL_PAID: "Withdrawal paid",
  REFUND_PAID: "Refund paid",
  TELLER_RETURN: "Returned to manager",
};

type Entry = { type: string; createdAt: string };

const field =
  "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500";

export function BalanceNotice({ balance }: { balance: number }) {
  if (Math.abs(balance) <= 0.005) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-4 py-3 text-sm">
      You currently hold ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Your account
      cannot be deactivated until this balance is 0. Hand the cash back to your manager to clear it.
    </div>
  );
}

export default function LedgerFilters<T extends Entry>({
  entries,
  children,
}: {
  entries: T[];
  children: (rows: T[]) => ReactNode;
}) {
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const types = useMemo(() => Array.from(new Set(entries.map((e) => e.type))), [entries]);

  const rows = useMemo(() => {
    const fromD = from ? new Date(`${from}T00:00:00`) : null;
    const toD = to ? new Date(`${to}T23:59:59.999`) : null;
    return entries.filter((e) => {
      const d = new Date(e.createdAt);
      if (type && e.type !== type) return false;
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      return true;
    });
  }, [entries, type, from, to]);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Type
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${field} block mt-1`}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{LEDGER_LABELS[t] ?? t}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${field} block mt-1`} />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${field} block mt-1`} />
        </label>
        <button
          onClick={() => { setType(""); setFrom(""); setTo(""); }}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Reset
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
          Showing {rows.length} of {entries.length}
        </span>
      </div>
      {rows.length === 0 && entries.length > 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          No entries match these filters.
        </div>
      ) : (
        children(rows)
      )}
    </>
  );
}