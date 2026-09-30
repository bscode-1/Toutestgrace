"use client";

import { useEffect, useState } from "react";

type Teller = { id: string; name: string; isActive: boolean; balance: number };

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const card = "bg-white dark:bg-slate-800 rounded-2xl shadow-sm";
const modalCard = "bg-white dark:bg-slate-800 rounded-2xl shadow-2xl";
const fieldBase =
  "px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const input = `w-full ${fieldBase}`;
const ghostBtn =
  "px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors";
const primaryBtn =
  "px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed";
const warnBtn =
  "px-4 py-2.5 text-sm font-medium rounded-xl border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const errorBox =
  "text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900";

export default function TeamPage() {
  const [tellers, setTellers] = useState<Teller[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cash, setCash] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "zero" | "funded">("all");

  // fund modal
  const [fundingFor, setFundingFor] = useState<Teller | null>(null);
  const [amount, setAmount] = useState("");
  const [fundError, setFundError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // collect modal
  const [collectTeller, setCollectTeller] = useState<Teller | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);

  async function loadCash() {
    try {
      const res = await fetch("/api/branch/me/cash", { headers: authHeaders() });
      if (res.ok) setCash((await res.json()).cashPosition);
    } catch {}
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/branch/me/tellers", { headers: authHeaders() });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || `Failed to load tellers (${res.status})`);
      setTellers(Array.isArray(d) ? d : d?.tellers ?? []);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadCash();
  }, []);

  function errMsg(d: any, fallback: string) {
    return d?.error?.formErrors?.[0] || (typeof d?.error === "string" ? d.error : null) || fallback;
  }

  async function submitFunding() {
    if (!fundingFor) return;
    const n = Number(amount);
    if (!n || n <= 0) return setFundError("Enter a valid amount");
    if (cash !== null && n > cash) return setFundError("Amount exceeds branch cash on hand");

    setSubmitting(true);
    setFundError(null);
    try {
      const res = await fetch(`/api/tellers/${fundingFor.id}/fund`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount: n }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errMsg(d, "Failed to fund teller"));
      setFundingFor(null);
      setAmount("");
      await Promise.all([load(), loadCash()]);
    } catch (err) {
      setFundError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCollect() {
    if (!collectTeller) return;
    const n = Number(collectAmount);
    if (!n || n <= 0) return setCollectError("Enter a valid amount");
    if (n > collectTeller.balance) return setCollectError("Amount exceeds the teller's balance");

    setCollecting(true);
    setCollectError(null);
    try {
      const res = await fetch(`/api/tellers/${collectTeller.id}/collect`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount: n }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errMsg(d, "Failed to collect"));
      setCollectTeller(null);
      setCollectAmount("");
      await Promise.all([load(), loadCash()]);
    } catch (err) {
      setCollectError((err as Error).message);
    } finally {
      setCollecting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading...</div>;
  }

  const filtered = tellers.filter((t) => {
    if (search.trim() && !t.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (statusFilter === "active" && !t.isActive) return false;
    if (statusFilter === "inactive" && t.isActive) return false;
    if (balanceFilter === "zero" && Math.abs(t.balance) > 0.005) return false;
    if (balanceFilter === "funded" && Math.abs(t.balance) <= 0.005) return false;
    return true;
  });

  const initials = (n: string) =>
    n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const money = (n: number) =>
    `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">My Tellers</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Fund your tellers, collect cash back, and review their ledgers.
        </p>
      </div>

      {cash !== null && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm card-hover mb-6 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-white/70 uppercase tracking-wide">Branch cash on hand</p>
            <i className="fa-solid fa-wallet text-white/60" />
          </div>
          <p className="text-2xl font-bold">{money(cash)}</p>
        </div>
      )}

      {loadError && <div className={`${errorBox} mb-4`}>{loadError}</div>}

      {!loadError && tellers.length === 0 && (
        <div className={`${card} p-10 text-center`}>
          <i className="fa-solid fa-users text-3xl text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No tellers are assigned to this branch yet.
          </p>
        </div>
      )}

      {tellers.length > 0 && (
        <div className={`${card} p-4 mb-4 flex flex-wrap items-center gap-3`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teller name"
            className={`${fieldBase} w-56`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={fieldBase}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as any)}
            className={fieldBase}
          >
            <option value="all">All balances</option>
            <option value="funded">Holding cash</option>
            <option value="zero">Zero balance</option>
          </select>
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setBalanceFilter("all");
            }}
            className={ghostBtn}
          >
            Reset
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
            Showing {filtered.length} of {tellers.length}
          </span>
        </div>
      )}

      {tellers.length > 0 && filtered.length === 0 && (
        <div className={`${card} p-10 text-center`}>
          <i className="fa-solid fa-magnifying-glass text-3xl text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No tellers match these filters.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((t) => (
          <div
            key={t.id}
            className={`${card} card-hover flex flex-wrap items-center justify-between gap-4 px-5 py-4`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                {initials(t.name)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/branch/team/${t.id}`}
                    className="font-medium text-slate-900 dark:text-white hover:underline"
                  >
                    {t.name}
                  </a>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      t.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Balance{" "}
                  <span className="text-slate-900 dark:text-white font-semibold text-sm">
                    {money(t.balance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a href={`/branch/team/${t.id}`} className={ghostBtn}>
                View Ledger
              </a>
              <button
                onClick={() => {
                  setCollectTeller(t);
                  setCollectAmount("");
                  setCollectError(null);
                }}
                disabled={t.balance <= 0}
                className={warnBtn}
              >
                Collect
              </button>
              <button
                onClick={() => {
                  setFundingFor(t);
                  setAmount("");
                  setFundError(null);
                }}
                disabled={!t.isActive || (cash ?? 0) <= 0}
                className={primaryBtn}
              >
                Fund
              </button>
            </div>
          </div>
        ))}
      </div>

      {fundingFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`${modalCard} p-6 w-full max-w-sm`}>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
              Fund {fundingFor.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Available: {money(cash ?? 0)}
            </p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className={`${input} mb-3`}
            />
            {fundError && <div className={`${errorBox} mb-3`}>{fundError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setFundingFor(null)} className={ghostBtn}>
                Cancel
              </button>
              <button onClick={submitFunding} disabled={submitting} className={primaryBtn}>
                {submitting ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {collectTeller && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`${modalCard} p-6 w-full max-w-sm`}>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
              Collect from {collectTeller.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Teller balance: {money(collectTeller.balance)}
            </p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              placeholder="Amount"
              className={`${input} mb-3`}
            />
            {collectError && <div className={`${errorBox} mb-3`}>{collectError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setCollectTeller(null)} className={ghostBtn}>
                Cancel
              </button>
              <button
                onClick={submitCollect}
                disabled={collecting}
                className="px-4 py-2.5 text-sm font-medium rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50"
              >
                {collecting ? "Collecting..." : "Collect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}