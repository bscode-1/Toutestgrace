"use client";

import { useEffect, useState } from "react";

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleString();

type Mode = "manager" | "teller";
type Tab = "commission" | "partner" | "teller";

export default function CapitalActivity({ mode = "manager" }: { mode?: Mode }) {
  const isManager = mode === "manager";
  const [tab, setTab] = useState<Tab>(isManager ? "commission" : "teller");
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

    const reqs: Promise<Response>[] = [
      fetch(`/api/branch/me/commission?${qs}`, { headers: headers() }),
      fetch(`/api/branch/me/teller-activity`, { headers: headers() }),
    ];
    if (isManager) {
      reqs.push(fetch(`/api/branch/me/partner-activity`, { headers: headers() }));
    }
    const [c, t, p] = await Promise.all(reqs);
    if (c.ok) setCommission(await c.json());
    if (t.ok) setTeller(await t.json());
    if (p && p.ok) setPartner(await p.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabBtn = (key: Tab, label: string) => (
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
          {isManager ? (
            <>
              {tabBtn("commission", "Commission")}
              {tabBtn("partner", "Partner Transactions")}
              {tabBtn("teller", "Teller Transactions")}
            </>
          ) : (
            <>
              {tabBtn("teller", "Manager Cash")}
              {tabBtn("commission", "Commission")}
            </>
          )}
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
        <CommissionPanel data={commission} />
      ) : tab === "partner" && isManager ? (
        <PartnerPanel data={partner} />
      ) : (
        <TellerPanel data={teller} isManager={isManager} />
      )}
    </div>
  );
}

function CommissionPanel({ data }: { data: any }) {
  return (
    <div>
      <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
        Commission earned:{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{fmt(data?.total ?? 0)}</span>{" "}
        · {data?.count ?? 0} transactions
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
            {(data?.transactions ?? []).map((t: any) => (
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
            {(data?.transactions ?? []).length === 0 && (
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
  );
}

function PartnerPanel({ data }: { data: any }) {
  return (
    <div>
      <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
        Received:{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {fmt(data?.totalReceived ?? 0)}
        </span>{" "}
        · Returned:{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {fmt(data?.totalReturned ?? 0)}
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
            {(data?.items ?? []).map((i: any) => (
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
            {(data?.items ?? []).length === 0 && (
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
  );
}

function TellerPanel({ data, isManager }: { data: any; isManager: boolean }) {
  const [tellerId, setTellerId] = useState("");
  const items = (data?.items ?? []).filter((i: any) => !tellerId || i.tellerId === tellerId);
  const funded = items
    .filter((i: any) => i.type === "MANAGER_FUNDING")
    .reduce((s: number, i: any) => s + i.amount, 0);
  const returned = items
    .filter((i: any) => i.type === "TELLER_RETURN")
    .reduce((s: number, i: any) => s + i.amount, 0);

  // manager: funding = money out (−), return = money in (+); teller: reversed
  const sign = (type: string) =>
    (type === "MANAGER_FUNDING") === isManager ? "−" : "+";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-slate-600 dark:text-slate-300">
        <div>
          {isManager ? "Funded" : "Received from manager"}:{" "}
          <span className="font-semibold text-slate-900 dark:text-white">{fmt(funded)}</span> ·{" "}
          {isManager ? "Returned" : "Returned to manager"}:{" "}
          <span className="font-semibold text-slate-900 dark:text-white">{fmt(returned)}</span>
        </div>
        {isManager && (
          <select
            value={tellerId}
            onChange={(e) => setTellerId(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1"
          >
            <option value="">All tellers</option>
            {(data?.tellers ?? []).map((t: any) => (
              <option key={t.id} value={t.id} className="text-slate-800">
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-y border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-2">Date</th>
              {isManager && <th className="px-4 py-2">Teller</th>}
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i: any) => (
              <tr key={i.id} className="border-b border-slate-100 dark:border-slate-700/50">
                <td className="px-4 py-2">{fmtDate(i.date)}</td>
                {isManager && <td className="px-4 py-2">{i.tellerName}</td>}
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      i.type === "MANAGER_FUNDING"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    }`}
                  >
                    {i.type === "MANAGER_FUNDING"
                      ? isManager ? "Funded teller" : "Funded by manager"
                      : isManager ? "Returned by teller" : "Returned to manager"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-medium">
                  {sign(i.type)}
                  {fmt(i.amount)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={isManager ? 4 : 3} className="px-4 py-6 text-center text-slate-500">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}