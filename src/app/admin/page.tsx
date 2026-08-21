"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import SummaryCards from "@/components/SummaryCards";
import QuickStats from "@/components/QuickStats";
import StatusDonutChart from "@/components/StatusDonutChart";
import VolumeTrendChart from "@/components/VolumeTrendChart";
import RecentTransactions from "@/components/RecentTransactions";

type Summary = {
  totalSent: { count: number; amount: number };
  totalReceived: { count: number; amount: number };
  pending: { count: number; amount: number };
  completed: { count: number; amount: number };
  refunded: { count: number; amount: number };
};

type TrendDay = { label: string; sent: number; completed: number };

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [transactions, setTransactions] = useState([]);
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, trendRes, txRes, branchesRes] = await Promise.all([
          apiFetch("/api/dashboard/summary"),
          apiFetch("/api/dashboard/trend"),
          apiFetch("/api/transactions?limit=6"),
          apiFetch("/api/branches"),
        ]);

        if (summaryRes.ok) setSummary((await summaryRes.json()));
        if (trendRes.ok) setTrend((await trendRes.json()).days);
        if (txRes.ok) setTransactions((await txRes.json()).transactions);
        if (branchesRes.ok) {
          const data = await branchesRes.json();
          setBranchCount(data.branches?.length ?? null);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-sm text-slate-500 p-4">Loading dashboard...</p>;
  if (error) return <p className="text-sm text-red-600 p-4">{error}</p>;
  if (!summary) return null;

  const cards = [
    { label: "Total Sent", count: summary.totalSent.count, amount: summary.totalSent.amount, gradient: "from-rose-400 to-pink-500", icon: "fa-paper-plane" },
    { label: "Total Received", count: summary.totalReceived.count, amount: summary.totalReceived.amount, gradient: "from-blue-500 to-indigo-600", icon: "fa-hand-holding-dollar" },
    { label: "Pending", count: summary.pending.count, amount: summary.pending.amount, gradient: "from-amber-400 to-orange-500", icon: "fa-clock" },
    { label: "Completed", count: summary.completed.count, amount: summary.completed.amount, gradient: "from-teal-500 to-emerald-600", icon: "fa-check-double" },
    { label: "Refunded", count: summary.refunded.count, amount: summary.refunded.amount, gradient: "from-slate-500 to-slate-700", icon: "fa-rotate-left" },
  ];

  const quickStats = [
    { icon: "fa-solid fa-building-columns", label: "Branches", value: String(branchCount ?? "—"), color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30" },
    { icon: "fa-solid fa-hourglass-half", label: "Pending", value: String(summary.pending.count), color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30" },
    { icon: "fa-solid fa-check", label: "Completed Today", value: String(summary.completed.count), color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/30" },
    { icon: "fa-solid fa-rotate-left", label: "Refunded Today", value: String(summary.refunded.count), color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-700" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">System-wide activity, today</p>
      </div>

      <SummaryCards metrics={cards} />
      <QuickStats stats={quickStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 mb-6">
        <VolumeTrendChart days={trend} />
        <StatusDonutChart
          completed={summary.completed.count}
          pending={summary.pending.count}
          refunded={summary.refunded.count}
        />
      </div>

      <RecentTransactions transactions={transactions} />
    </div>
  );
}