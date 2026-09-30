"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";

type EntryType =
  | "DEPOSIT_COLLECTED"
  | "WITHDRAWAL_PAID"
  | "REFUND_PAID"
  | "MANAGER_FUNDING"
  | "TELLER_RETURN";

type Entry = { id: string; type: EntryType; amount: number | string; createdAt: string };

const META: Record<EntryType, { self: string; other: string; sign: 1 | -1; icon: string }> = {
  DEPOSIT_COLLECTED: { self: "Deposit collected", other: "Deposit collected", sign: 1, icon: "fa-arrow-down" },
  MANAGER_FUNDING: { self: "Funding from manager", other: "Funding given", sign: 1, icon: "fa-hand-holding-dollar" },
  WITHDRAWAL_PAID: { self: "Withdrawal paid out", other: "Withdrawal paid out", sign: -1, icon: "fa-arrow-up" },
  REFUND_PAID: { self: "Refund paid out", other: "Refund paid out", sign: -1, icon: "fa-rotate-left" },
  TELLER_RETURN: { self: "Cash returned to manager", other: "Cash returned to manager", sign: -1, icon: "fa-arrow-turn-up" },
};

const PAGE_SIZE = 20;
const money = (n: number) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (d: string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const card = "bg-white dark:bg-slate-800 rounded-2xl shadow-sm card-hover";
const label = "block text-xs font-medium text-slate-500 dark:text-slate-400";
const field =
  "w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const ghostBtn =
  "px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors";
const errorBox =
  "text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900";

export default function LedgerView({
  title,
  subtitle,
  endpoint,
  selfView = false,
  backHref,
}: {
  title: string;
  subtitle?: string;
  endpoint: string | null;
  selfView?: boolean;
  backHref?: string;
}) {
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tellerName, setTellerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<"" | EntryType>("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const d = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = typeof d?.error === "string" ? d.error : d?.error?.formErrors?.[0];
          throw new Error(msg || `Failed to load ledger (${res.status})`);
        }
        if (cancelled) return;
        setBalance(Number(d.balance ?? 0));
        setEntries(d.entries ?? []);
        setTellerName(d.teller?.name ?? d.tellerName ?? null);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [endpoint]);

  useEffect(() => { setPage(1); }, [from, to, type]);

  const filtered = useMemo(() => {
    const fromD = from ? new Date(`${from}T00:00:00`) : null;
    const toD = to ? new Date(`${to}T23:59:59.999`) : null;
    return entries.filter((e) => {
      const d = new Date(e.createdAt);
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      if (type && e.type !== type) return false;
      return true;
    });
  }, [entries, from, to, type]);

  const moneyIn = filtered.filter((e) => META[e.type]?.sign === 1).reduce((s, e) => s + Number(e.amount), 0);
  const moneyOut = filtered.filter((e) => META[e.type]?.sign === -1).reduce((s, e) => s + Number(e.amount), 0);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const zero = Math.abs(balance) <= 0.005;

  return (
    <div className="p-6 max-w-4xl">
      {backHref && (
        <a
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-3"
        >
          <i className="fa-solid fa-arrow-left text-xs" /> Back to team
        </a>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {tellerName ? `${title} · ${tellerName}` : title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>

      {error && <div className={`${errorBox} mb-4`}>{error}</div>}

      {loading && !error ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-sm card-hover">
              <p className="text-xs text-white/70 uppercase tracking-wide mb-2">Current balance</p>
              <p className="text-2xl font-bold">{money(balance)}</p>
            </div>
            <div className={`${card} p-5`}>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Money in</p>
              <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">+{money(moneyIn)}</p>
            </div>
            <div className={`${card} p-5`}>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Money out</p>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">-{money(moneyOut)}</p>
            </div>
          </div>

          {zero && !error && (
            <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-3 py-2 text-sm">
              {selfView
                ? "Your balance is $0.00. Ask your manager for funding before paying out pickups or refunds."
                : "This teller's balance is $0.00."}
            </div>
          )}

                    <div className={`${card} p-4 mb-4 flex items-end gap-3 overflow-x-auto`}>
            <label className={`${label} flex-1 min-w-[140px]`}>
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={`${field} dark:[color-scheme:dark]`}
              />
            </label>
            <label className={`${label} flex-1 min-w-[140px]`}>
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={`${field} dark:[color-scheme:dark]`}
              />
            </label>
            <label className={`${label} flex-1 min-w-[180px]`}>
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "" | EntryType)}
                className={field}
              >
                <option value="">All types</option>
                {(Object.keys(META) as EntryType[]).map((k) => (
                  <option key={k} value={k}>{selfView ? META[k].self : META[k].other}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => { setFrom(""); setTo(""); setType(""); }}
              className={`${ghostBtn} shrink-0 flex items-center gap-2`}
            >
              <i className="fa-solid fa-rotate-left text-xs" />
              Reset
            </button>
          </div>

          <div className={`${card} overflow-hidden`}>
            {visible.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <i className="fa-solid fa-receipt text-3xl text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {entries.length === 0 ? "No ledger activity yet." : "No entries match these filters."}
                </p>
              </div>
            ) : (
              visible.map((e) => {
                const m = META[e.type];
                const debit = m?.sign === -1;
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                          debit
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        <i className={`fa-solid ${m?.icon ?? "fa-circle"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {m ? (selfView ? m.self : m.other) : e.type}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{fmt(e.createdAt)}</div>
                      </div>
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        debit ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {debit ? "-" : "+"}{money(Number(e.amount))}
                    </div>
                  </div>
                );
              })
            )}
            {filtered.length > 0 && (
              <Pagination
                currentPage={page}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}