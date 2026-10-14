"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import BranchesSituation from "@/components/accounts/BranchesSituation";
import { downloadBranchesPdf } from "@/lib/accounts-pdf";
import type { BranchSituation } from "@/lib/branch-accounts";

type CashAtHand = {
  netCashAtHand: number;
  ledgerPosition: number;
  totalTopups: number;
  totalCommissionEarned: number;
  totalExpenses: number;
  totalSalaries: number;
};

const pad = (x: number) => String(x).padStart(2, "0");
const todayStr = () => new Date().toLocaleDateString("en-CA");
const monthStartStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

export default function AccountsOverviewPage() {
  const [data, setData] = useState<CashAtHand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<BranchSituation[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const periodLabel =
    from || to ? `${from || "start"} to ${to || todayStr()}` : "All time";

    useEffect(() => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) qs.set("to", new Date(`${to}T23:59:59.999`).toISOString());

    setLoading(true);
    setError(null);
    apiFetch(`/api/reports/cash-at-hand?${qs.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load company situation");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) qs.set("to", new Date(`${to}T23:59:59.999`).toISOString());

    setRowsLoading(true);
    setRowsError(null);
    apiFetch(`/api/accounts/branches-overview?${qs.toString()}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load branches");
        setRows(json.branches);
      })
      .catch((err) => setRowsError(err.message))
      .finally(() => setRowsLoading(false));
  }, [from, to]);

  function fmt(n: number) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  const inputCls =
    "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const chipCls =
    "rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/40";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Accounts Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The company&apos;s exact financial situation, right now
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
          <button
            className={chipCls}
            onClick={() => {
              setFrom(todayStr());
              setTo(todayStr());
            }}
          >
            Today
          </button>
          <button
            className={chipCls}
            onClick={() => {
              setFrom(monthStartStr());
              setTo(todayStr());
            }}
          >
            This month
          </button>
          <button
            className={chipCls}
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            All
          </button>
          <button
            disabled={rowsLoading || rows.length === 0}
            onClick={() => downloadBranchesPdf(rows, periodLabel)}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            <i className="fa-solid fa-file-pdf mr-1" /> PDF Report
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {data && (
        <>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg mb-6">
            <p className="text-xs text-white/70 uppercase tracking-wide mb-2">Net Cash at Hand</p>
            <p className="text-4xl font-bold">{fmt(data.netCashAtHand)}</p>
            <p className="text-xs text-white/70 mt-2">
              Ledger position minus all expenses and salaries paid to date
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Ledger Position</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{fmt(data.ledgerPosition)}</p>
              <p className="text-xs text-slate-400 mt-1">All branches combined</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Topups</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmt(data.totalTopups)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Commission Earned</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {fmt(data.totalCommissionEarned)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Outstanding</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">—</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/admin/accounts/expenses"
              className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover hover:bg-slate-50 dark:hover:bg-slate-700/40"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                  <i className="fa-solid fa-file-invoice-dollar text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{fmt(data.totalExpenses)} {periodLabel === "All time" ? "paid to date" : `paid, ${periodLabel}`}</p>
                  <p className="text-xs text-slate-400">{fmt(data.totalSalaries)} {periodLabel === "All time" ? "paid to date" : `paid, ${periodLabel}`}</p>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 text-xs" />
            </a>
            <a
              href="/admin/accounts/salaries"
              className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover hover:bg-slate-50 dark:hover:bg-slate-700/40"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <i className="fa-solid fa-money-check-dollar text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Salaries</p>
                  <p className="text-xs text-slate-400">{fmt(data.totalSalaries)} paid to date</p>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 text-xs" />
            </a>
          </div>
        </>
      )}

      <BranchesSituation
        rows={rows}
        loading={rowsLoading}
        error={rowsError}
        periodLabel={periodLabel}
      />
    </div>
  );
}