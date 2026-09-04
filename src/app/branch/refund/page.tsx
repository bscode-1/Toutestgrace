"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";

type RefundedTransaction = {
  id: string;
  pickupCode: string;
  senderName: string;
  receiverName: string;
  amountSent: number;
  status: string;
};

export default function RefundPage() {
  const { t, language, setLanguage } = useLanguage();
  const [pickupCode, setPickupCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RefundedTransaction | null>(null);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/transactions/refund", {
        method: "POST",
        body: JSON.stringify({
          pickupCode: pickupCode.trim(),
          senderName: senderName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund");
      }
      setResult(data.transaction);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setPickupCode("");
    setSenderName("");
    setError(null);
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 text-center card-hover">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-rotate-left text-slate-600 dark:text-slate-300 text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{t("refundComplete")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Hand the full amount back to {result.senderName}
          </p>

          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-6 mb-6">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Amount Refunded</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              ${Number(result.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">{t("noCommissionKept")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left mb-6">
            <div>
              <p className="text-xs text-slate-400">{t("senderName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.senderName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("receiverNameCheck")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.receiverName}</p>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity"
          >
            Process Another Refund
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("refund")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sender changed their mind — return the full amount
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
        <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Only works for transfers still <strong>pending</strong> pickup. Once collected, a transfer can no
          longer be refunded here.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-5 card-hover">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t("pickupCode")}
          </label>
          <input
            type="text"
            required
            value={pickupCode}
            onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, "").slice(0, 16))}
            placeholder="16-digit code"
            inputMode="numeric"
            className="w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-2xl font-bold tracking-widest text-center font-mono text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Sender name (optional cross-check)
          </label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Confirm the name on the receipt"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            If provided, it must match the name on record for this transfer.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || pickupCode.length !== 16}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "Processing..." : "Process Refund"}
        </button>
      </form>
    </div>
  );
}