"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";

type Branch = {
  id: string;
  name: string;
  isActive: boolean;
};

type Partner = {
  id: string;
  name: string;
};

type BranchCapital = {
  totalDeposits: number;
  totalRefunds: number;
  totalCommission: number;
  totalWithdrawals: number;
  alreadyReturned: number;
  outstanding: number;
  cashPosition: number;
};

type BranchRow = Branch & {
  capital: BranchCapital | null;
  capitalError: boolean;
  cashPosition?: number;
};

export default function BranchCapitalPage() {
  const { t } = useLanguage();

  const [rows, setRows] = useState<BranchRow[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const [returnModalBranch, setReturnModalBranch] = useState<BranchRow | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [returnAmount, setReturnAmount] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [branchesRes, partnersRes] = await Promise.all([
        apiFetch("/api/branches"),
        apiFetch("/api/partners"),
      ]);

      if (!branchesRes.ok) throw new Error("Failed to load branches");
      if (!partnersRes.ok) throw new Error("Failed to load partners");

      const branchesData = await branchesRes.json();
      const partnersData = await partnersRes.json();

      const branches: Branch[] = branchesData.branches ?? branchesData;
      const partnersList: Partner[] = partnersData.partners ?? partnersData;

      setPartners(partnersList);

      // Best-effort permission check; if the route/shape differs, the
      // Return Capital button just stays hidden rather than erroring out.
      try {
        const permsRes = await apiFetch("/api/permissions/me");
        if (permsRes.ok) {
          const permsData = await permsRes.json();
          const keys: string[] = permsData.permissions ?? permsData;
          setCanManage(Array.isArray(keys) && keys.includes("MANAGE_BRANCH_CAPITAL"));
        }
      } catch {
        setCanManage(false);
      }

      const withCapital: BranchRow[] = await Promise.all(
        branches.map(async (branch) => {
          try {
            const capRes = await apiFetch(`/api/branches/${branch.id}/capital`);
            if (!capRes.ok) return { ...branch, capital: null, capitalError: true };
            const capital: BranchCapital = await capRes.json();
            return { ...branch, capital, capitalError: false };
          } catch {
            return { ...branch, capital: null, capitalError: true };
          }
        })
      );

      setRows(withCapital);
    } catch (err) {
      setError((err as Error).message || t("failedToLoadBranchCapital"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openReturnModal(branch: BranchRow) {
    setReturnModalBranch(branch);
    setSelectedPartnerId("");
    setReturnAmount(branch.capital ? String(branch.capital.outstanding) : "");
    setReturnNotes("");
    setSubmitError(null);
  }

  function closeReturnModal() {
    setReturnModalBranch(null);
  }

  async function submitReturn() {
    if (!returnModalBranch) return;
    if (!selectedPartnerId) {
      setSubmitError(t("selectPartner"));
      return;
    }
    const amountNum = Number(returnAmount);
    if (!amountNum || amountNum <= 0) {
      setSubmitError(t("enterValidAmount"));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch(`/api/branches/${returnModalBranch.id}/capital-return`, {
        method: "POST",
        body: JSON.stringify({
          partnerId: selectedPartnerId,
          amount: amountNum,
          notes: returnNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || data.error || t("failedToRecordReturn"));

      closeReturnModal();
      await loadData();
    } catch (err) {
      setSubmitError((err as Error).message || t("failedToRecordReturn"));
    } finally {
      setSubmitting(false);
    }
  }

  function formatMoney(value: number) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("branchCapital")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("branchCapitalSubtitle")}</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">{t("loadingBranchCapital")}</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm">
          <i className="fa-solid fa-building-columns text-3xl text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("noBranchesFound")}</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">{t("branch")}</th>
                  <th className="px-5 py-3 font-medium text-right">{t("deposits")}</th>
                  <th className="px-5 py-3 font-medium text-right">{t("withdrawals")}</th>
                  <th className="px-5 py-3 font-medium text-right">{t("commission")}</th>
                  <th className="px-5 py-3 font-medium text-right">{t("refunds")}</th>
                  <th className="px-5 py-3 font-medium text-right">{t("alreadyReturned")}</th>
                  <th className="px-5 py-3 font-medium text-right">{t("outstanding")}</th>
                  <th className="px-4 py-3 font-medium">Cash on hand</th>
                  {canManage && <th className="px-5 py-3 font-medium text-right">{t("actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{row.name}</td>
                    {row.capitalError || !row.capital ? (
                      <td
                        colSpan={canManage ? 6 : 5}
                        className="px-5 py-4 text-center text-slate-400"
                      >
                        {t("unableToLoad")}
                      </td>
                    ) : (
                      <>
                        <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">
                          {formatMoney(row.capital.totalDeposits)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">
                          {formatMoney(row.capital.totalWithdrawals)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">
                          {formatMoney(row.capital.totalCommission)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">
                          {formatMoney(row.capital.totalRefunds)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">
                          {formatMoney(row.capital.alreadyReturned)}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-white">
                          {formatMoney(row.capital.outstanding)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                          {row.capital?.cashPosition !== undefined ? `$${row.capital.cashPosition.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                      </>
                    )}
                    {canManage && (
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openReturnModal(row)}
                          disabled={!row.capital || row.capital.outstanding <= 0}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium rounded-xl px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t("returnCapital")}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {returnModalBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
              {t("returnCapital")} — {returnModalBranch.name}
            </h3>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("partner")}
            </label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full mb-3 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("selectPartner")}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("amount")}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={returnAmount}
              onChange={(e) => setReturnAmount(e.target.value)}
              className="w-full mb-3 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("notesOptional")}
            </label>
            <textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              rows={2}
              className="w-full mb-3 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {submitError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {submitError}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeReturnModal}
                disabled={submitting}
                className="text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {t("cancel")}
              </button>
              <button
                onClick={submitReturn}
                disabled={submitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? t("saving") : t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

