"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";

type BranchInfo = {
  id: string;
  name: string;
  status: string;
  location: string | null;
  manager: { name: string } | null;
  currency: { symbol: string } | null;
};

type Summary = {
  totalSent: { count: number; amount: number };
  totalReceived: { count: number; amount: number };
  pending: { count: number; amount: number };
};

type Tx = {
  id: string;
  senderName: string;
  receiverName: string;
  amountSent: number;
  status: string;
  createdAt: string;
  senderBranch: { name: string };
  receiverBranch: { name: string };
};


const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REFUNDED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

export default function BranchDashboardPage() {
  const { t } = useLanguage();
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    async function load() {
      try {
        const [meRes, summaryRes, txRes] = await Promise.all([
          apiFetch("/api/branch/me"),
          apiFetch("/api/dashboard/summary"),
          apiFetch("/api/transactions?limit=6"),
        ]);

        if (meRes.ok) {
          const data = await meRes.json();
          setBranchInfo(data.branch);
          setBalance(data.balance);
        }
        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (txRes.ok) setTransactions((await txRes.json()).transactions);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const currencySymbol = branchInfo?.currency?.symbol || "$";

  const quickActions = [
    { label: t("newTransfer"), href: "/branch/new-transfer", icon: "fa-paper-plane", gradient: "from-blue-500 to-indigo-600" },
    { label: t("completePickup"), href: "/branch/complete", icon: "fa-hand-holding-dollar", gradient: "from-teal-500 to-emerald-600" },
    { label: t("refund"), href: "/branch/refund", icon: "fa-rotate-left", gradient: "from-rose-400 to-pink-500" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {branchInfo?.name || t("myBranch")}
            </h1>
            {branchInfo && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  branchInfo.status === "ACTIVE"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {branchInfo.status}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{branchInfo?.location || ""}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {quickActions.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className={`bg-gradient-to-br ${a.gradient} rounded-2xl p-5 text-white shadow-lg card-hover flex items-center gap-4`}
          >
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <i className={`fa-solid ${a.icon} text-lg`} />
            </div>
            <div>
              <p className="text-sm font-semibold">{a.label}</p>
              <p className="text-xs text-white/70">Tap to start</p>
            </div>
          </a>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("branchBalance")}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {currencySymbol}
            {balance !== null ? Number(balance).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("sentToday")}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary ? summary.totalSent.count : "—"}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("receivedToday")}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary ? summary.totalReceived.count : "—"}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("pending")}</p>
          <p className="text-2xl font-bold text-amber-500">{summary ? summary.pending.count : "—"}</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("recentActivity")}</h3>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400 p-5">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {tx.senderName} → {tx.receiverName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {tx.senderBranch.name} → {tx.receiverBranch.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {currencySymbol}
                    {Number(tx.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[tx.status]}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
