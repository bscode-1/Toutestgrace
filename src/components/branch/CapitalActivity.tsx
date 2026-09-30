"use client";

import { useEffect, useState } from "react";

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleString();

export default function CapitalActivity() {
  const [tab, setTab] = useState<"commission" | "partner" | "teller">("commission");
  const [commission, setCommission] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [teller, setTeller] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const [c, p] = await Promise.all([
      fetch(`/api/branch/me/commission?${qs}`, { headers: headers() }),
      fetch(`/api/branch/me/partner-activity`, { headers: headers() }),
    ]);
    if (c.ok) setCommission(await c.json());
    if (p.ok) setPartner(await p.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabBtn = (key: "commission" | "partner", label: string) => (
    <button
      onClick={() => setTab(key)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
        tab === key
          ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
          : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 card-hover">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          {tabBtn("commission", "Commission")}
          {tabBtn("partner", "Partner Transactions")}
        </div>
        {tab === "commission" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1"
            />
            <button
              onClick={load}
              className="rounded-lg bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 px-3 py-1"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-slate-500">Loading…</p>
      ) : tab === "commission" ? (
        <div>
          <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
            Commission earned:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {fmt(commission?.total ?? 0)}
            </span>{" "}
            · {commission?.count ?? 0} transactions
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Amount sent</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Total charged</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(commission?.transactions ?? []).map((t: any) => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-2">{fmtDate(t.createdAt)}</td>
                    <td className="px-4 py-2">{fmt(t.amountSent)}</td>
                    <td className="px-4 py-2">
                      {t.commissionMode === "PAID_BY_SENDER" ? "Paid by sender" : "Deducted"}
                    </td>
                    <td className="px-4 py-2">{fmt(t.totalCharged)}</td>
                    <td className="px-4 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {fmt(t.commission)}
                    </td>
                    <td className="px-4 py-2">{t.status}</td>
                  </tr>
                ))}
                {(commission?.transactions ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No commission yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
            Received:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {fmt(partner?.totalReceived ?? 0)}
            </span>{" "}
            · Returned:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {fmt(partner?.totalReturned ?? 0)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Partner</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(partner?.items ?? []).map((i: any) => (
                  <tr key={`${i.type}-${i.id}`} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-2">{fmtDate(i.date)}</td>
                    <td className="px-4 py-2">{i.partnerName}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          i.type === "RECEIVED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {i.type === "RECEIVED" ? "Received from partner" : "Returned to partner"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {i.type === "RECEIVED" ? "+" : "−"}
                      {fmt(i.amount)}
                    </td>
                  </tr>
                ))}
                {(partner?.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No partner transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}