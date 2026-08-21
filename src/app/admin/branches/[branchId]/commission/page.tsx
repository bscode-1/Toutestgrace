"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/client-auth";

type Tier = {
  id: string;
  minAmount: number;
  maxAmount: number;
  commissionType: "PERCENTAGE" | "FLAT";
  commissionPercent: number | null;
  commissionFlatAmount: number | null;
  createdAt: string;
};

type BranchInfo = { name: string; currency: { symbol: string } | null };

export default function CommissionTiersPage() {
  const params = useParams();
  const branchId = params.branchId as string;

  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [commissionType, setCommissionType] = useState<"PERCENTAGE" | "FLAT">("PERCENTAGE");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionFlatAmount, setCommissionFlatAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [branchRes, tiersRes] = await Promise.all([
        apiFetch(`/api/branches/${branchId}`),
        apiFetch(`/api/branches/${branchId}/commission-tiers`),
      ]);
      if (branchRes.ok) setBranch((await branchRes.json()).branch);
      if (!tiersRes.ok) throw new Error("Failed to load commission tiers");
      setTiers((await tiersRes.json()).tiers);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (branchId) loadData();
  }, [branchId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        minAmount: Number(minAmount),
        maxAmount: Number(maxAmount),
        commissionType,
      };
      if (commissionType === "PERCENTAGE") {
        body.commissionPercent = Number(commissionPercent);
      } else {
        body.commissionFlatAmount = Number(commissionFlatAmount);
      }

      const res = await apiFetch(`/api/branches/${branchId}/commission-tiers`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.formErrors?.[0] || data.error || "Failed to create tier");
      }
      setMinAmount("");
      setMaxAmount("");
      setCommissionPercent("");
      setCommissionFlatAmount("");
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const currencySymbol = branch?.currency?.symbol || "$";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <a href={`/admin/branches/${branchId}`} className="hover:underline">
              {branch?.name || "Branch"}
            </a>
            <i className="fa-solid fa-chevron-right text-[10px]" />
            <span>Commission Tiers</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Commission Tiers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The system picks the matching tier automatically based on the amount sent
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
        >
          <i className="fa-solid fa-plus text-xs" />
          New Tier
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 card-hover"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add a commission tier</h3>

          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Min amount
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="e.g. 10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Max amount
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Commission type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCommissionType("PERCENTAGE")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    commissionType === "PERCENTAGE"
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400"
                      : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setCommissionType("FLAT")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    commissionType === "FLAT"
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400"
                      : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Flat Fee
                </button>
              </div>
            </div>

            {commissionType === "PERCENTAGE" ? (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Commission percent (%)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Flat fee ({currencySymbol})
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={commissionFlatAmount}
                  onChange={(e) => setCommissionFlatAmount(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Tier"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-slate-500">Loading tiers...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && tiers.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm">
          <i className="fa-solid fa-percent text-3xl text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No commission tiers set — transactions can&apos;t be created until at least one range is configured.
          </p>
        </div>
      )}

      {!loading && tiers.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Amount Range</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Charge</th>
              </tr>
            </thead>
            <tbody>
              {tiers
                .slice()
                .sort((a, b) => Number(a.minAmount) - Number(b.minAmount))
                .map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                      {currencySymbol}
                      {Number(t.minAmount).toLocaleString()} – {currencySymbol}
                      {Number(t.maxAmount).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          t.commissionType === "FLAT"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {t.commissionType === "FLAT" ? "Flat Fee" : "Percentage"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                      {t.commissionType === "FLAT"
                        ? `${currencySymbol}${Number(t.commissionFlatAmount)}`
                        : `${Number(t.commissionPercent)}%`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}