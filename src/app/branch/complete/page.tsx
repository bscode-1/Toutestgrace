"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";

type LookupResult = {
  transaction: {
    id: string;
    pickupCode: string;
    status: string;
    senderName: string;
    receiverName: string;
    amountPayable: number;
    amountCollected: number;
    remaining: number;
    receiverBranchId: string;
    createdAt: string;
  };
  pickupEvents: Array<{ id: string; amount: number; receiptNumber: string; createdAt: string }>;
};

type CompletedFull = {
  id: string;
  pickupCode: string;
  senderName: string;
  receiverName: string;
  amountPayable: number;
  amountCollected: number;
  status: string;
};

type PartialResult = {
  pickupEvent: { id: string; amount: number; receiptNumber: string };
  transaction: {
    id: string;
    pickupCode: string;
    senderName: string;
    receiverName: string;
    amountPayable: number;
    amountCollected: number;
    remaining: number;
    status: string;
  };
};

type Mode = "full" | "partial";

export default function CompletePickupPage() {
  const { t } = useLanguage();

  const [mode, setMode] = useState<Mode>("full");
  const [pickupCode, setPickupCode] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fullResult, setFullResult] = useState<CompletedFull | null>(null);
  const [partialResult, setPartialResult] = useState<PartialResult | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setLookup(null);
    setLookingUp(true);
    try {
      const res = await apiFetch(`/api/transactions/lookup?code=${pickupCode.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to look up transaction");
      setLookup(data);
    } catch (err) {
      setLookupError((err as Error).message);
    } finally {
      setLookingUp(false);
    }
  }

  async function handleFullSubmit() {
    if (!lookup) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/transactions/complete", {
        method: "POST",
        body: JSON.stringify({
          pickupCode: lookup.transaction.pickupCode,
          receiverName: receiverName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete pickup");
      setFullResult(data.transaction);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePartialSubmit() {
    if (!lookup) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
          const res = await apiFetch("/api/transactions/partial-pickup", {
          method: "POST",
          body: JSON.stringify({
            pickupCode: lookup.transaction.pickupCode,
            amount: Number(withdrawAmount),
          }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process partial pickup");
      setPartialResult(data);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setLookup(null);
    setLookupError(null);
    setSubmitError(null);
    setFullResult(null);
    setPartialResult(null);
    setPickupCode("");
    setReceiverName("");
    setWithdrawAmount("");
  }

  if (fullResult) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 text-center card-hover">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-hand-holding-dollar text-green-600 dark:text-green-400 text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{t("payoutComplete")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {`Full payout — hand $${Number(fullResult.amountPayable).toLocaleString("en-US", { minimumFractionDigits: 2 })} to ${fullResult.receiverName}`}
          </p>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-6 mb-6">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("payOut")}</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${Number(fullResult.amountPayable).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left mb-6">
            <div>
              <p className="text-xs text-slate-400">{t("senderName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{fullResult.senderName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("receiverName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{fullResult.receiverName}</p>
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

  if (partialResult) {
    const { pickupEvent, transaction } = partialResult;
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 text-center card-hover">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-hand-holding-dollar text-amber-600 dark:text-amber-400 text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {transaction.status === "COMPLETED" ? t("payoutComplete") : "Partial Payout Recorded"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {`Hand $${Number(pickupEvent.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} to ${transaction.receiverName}`}
          </p>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-6 mb-6 grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Collected Now</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${Number(pickupEvent.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Remaining Balance</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${Number(transaction.remaining).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Receipt Number</p>
            <p className="text-lg font-bold tracking-wide text-amber-700 dark:text-amber-300 font-mono">{pickupEvent.receiptNumber}</p>
            <p className="text-xs text-amber-500 mt-1">
              Same pickup code (<span className="font-mono">{transaction.pickupCode}</span>) is still valid for the remaining balance.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left mb-6">
            <div>
              <p className="text-xs text-slate-400">{t("senderName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{transaction.senderName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("receiverName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{transaction.receiverName}</p>
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
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("enterPickupCode")}</p>
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 mb-4">
        <button
          type="button"
          onClick={() => setMode("full")}
          className={`flex-1 text-sm font-medium rounded-lg py-2 transition-colors ${
            mode === "full" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Full Pickup
        </button>
        <button
          type="button"
          onClick={() => setMode("partial")}
          className={`flex-1 text-sm font-medium rounded-lg py-2 transition-colors ${
            mode === "partial" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Partial Pickup
        </button>
      </div>

      {!lookup && (
        <form onSubmit={handleLookup} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-5 card-hover">
          {lookupError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{lookupError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("pickupCode")}</label>
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
          <button
            type="submit"
            disabled={lookingUp || pickupCode.length !== 16}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {lookingUp ? "Looking up..." : "Look Up Transaction"}
          </button>
        </form>
      )}

      {lookup && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-5 card-hover">
          {submitError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</div>
          )}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-xs text-slate-400">{t("senderName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{lookup.transaction.senderName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("receiverName")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{lookup.transaction.receiverName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total Payable</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                ${Number(lookup.transaction.amountPayable).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Already Collected</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                ${Number(lookup.transaction.amountCollected).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Remaining Balance</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${Number(lookup.transaction.remaining).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("receiverNameCheck")}</label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Confirm the name on the receipt"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mode === "partial" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount to withdraw now</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={lookup.transaction.remaining}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Up to $${Number(lookup.transaction.remaining).toFixed(2)}`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLookup(null)}
              className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity"
            >
              Back
            </button>
            {mode === "full" ? (
              <button
                type="button"
                onClick={handleFullSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Processing..." : `Pay Out $${Number(lookup.transaction.remaining).toFixed(2)}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePartialSubmit}
                disabled={submitting || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > lookup.transaction.remaining}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Confirm Partial Withdrawal"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}