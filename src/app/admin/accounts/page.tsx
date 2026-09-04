"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";

type CashAtHand = {
  netCashAtHand: number;
  ledgerPosition: number;
  totalTopups: number;
  totalCommissionEarned: number;
  totalExpenses: number;
  totalSalaries: number;
};

export default function AccountsOverviewPage() {
  const [data, setData] = useState<CashAtHand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/reports/cash-at-hand")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load company situation");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function fmt(n: number) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Accounts Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The company&apos;s exact financial situation, right now
        </p>
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
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Expenses</p>
                  <p className="text-xs text-slate-400">{fmt(data.totalExpenses)} paid to date</p>
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
    </div>
  );
}

