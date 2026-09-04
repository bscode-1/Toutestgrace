"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";

type CompletedTransaction = {
  id: string;
  pickupCode: string;
  senderName: string;
  receiverName: string;
  amountSent: number;
  amountPayable: number;
  status: string;
};

export default function CompletePickupPage() {  
  const { t, language, setLanguage } = useLanguage();
  const [pickupCode, setPickupCode] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompletedTransaction | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/transactions/complete", {
        method: "POST",
        body: JSON.stringify({
          pickupCode: pickupCode.trim(),
          receiverName: receiverName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete pickup");
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
    setReceiverName("");
    setError(null);
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 text-center card-hover">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-hand-holding-dollar text-green-600 dark:text-green-400 text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{t("payoutComplete")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Hand ${Number(result.amountPayable).toLocaleString("en-US", { minimumFractionDigits: 2 })} to{" "}
            {result.receiverName}
          </p>

          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-6 mb-6">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("payOut")}</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${Number(result.amountPayable).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left mb-6">
            <div>
              <p className="text-xs text-slate-400">{t("senderName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.senderName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("receiverName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.receiverName}</p>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity"
          >
            Complete Another Pickup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("completePickup")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("enterPickupCode")}
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
            {t("receiverNameCheck")}
          </label>
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
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
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "Verifying..." : "Pay Out"}
        </button>
      </form>
    </div>
  );
}