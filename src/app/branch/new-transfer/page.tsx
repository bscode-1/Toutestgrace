"use client";

import { useEffect, useState } from "react";
import { apiFetch, getUser } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";

type BranchOption = { id: string; name: string; location: string | null };

type CommissionMode = "DEDUCTED" | "PAID_BY_SENDER";

type CreatedTransaction = {
  id: string;
  pickupCode: string;
  senderName: string;
  receiverName: string;
  amountSent: number;
  commissionAmount: number;
  amountPayable: number;
  totalCharged: number;
  commissionMode: CommissionMode;
  qrCodeData: string;
};

export default function NewTransferPage() {
  const { t, language, setLanguage } = useLanguage();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [receiverBranchId, setReceiverBranchId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderIdNumber, setSenderIdNumber] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [amountSent, setAmountSent] = useState("");
  const [commissionMode, setCommissionMode] = useState<CommissionMode>("DEDUCTED");

  const [preview, setPreview] = useState<{ commissionAmount: number; amountPayable: number; totalCharged: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedTransaction | null>(null);
  

  useEffect(() => {
    const user = getUser();
    apiFetch("/api/branches/directory")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data) => {
        const allBranches = data.branches || [];
        const filtered = user?.branchId
          ? allBranches.filter((b: { id: string }) => b.id !== user.branchId)
          : allBranches;
        setBranches(filtered);
      });
  }, []);

  useEffect(() => {
    const amount = Number(amountSent);
    if (!amount || amount <= 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/api/branch/me/commission-preview?amount=${amount}&commissionMode=${commissionMode}`
        );
        const data = await res.json();
        if (!res.ok) {
          setPreview(null);
          setPreviewError(data.error || "No commission tier for this amount");
        } else {
          setPreview(data);
          setPreviewError(null);
        }
      } catch {
        setPreview(null);
      }
    }, 350);
    return () => clearTimeout(timeout);
    // re-run whenever the sender toggles who bears the commission
  }, [amountSent, commissionMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          receiverBranchId,
          senderName,
          senderIdNumber: senderIdNumber || undefined,
          receiverName,
          amountSent: Number(amountSent),
          commissionMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.formErrors?.[0] || data.error || "Failed to create transfer");
      }
      setResult(data.transaction);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function startNewTransfer() {
    setResult(null);
    setReceiverBranchId("");
    setSenderName("");
    setSenderIdNumber("");
    setReceiverName("");
    setAmountSent("");
    setCommissionMode("DEDUCTED");
    setPreview(null);
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 text-center card-hover">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-check text-green-600 dark:text-green-400 text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{t("transferCreated")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {t("giveCodeTo")} {result.senderName} {t("toShareWith")} {result.receiverName}
          </p>

          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-6 mb-6">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("pickupCode")}</p>
            <p className="text-3xl font-bold tracking-widest text-slate-900 dark:text-white font-mono">
              {result.pickupCode}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left mb-3">
            <div>
              <p className="text-xs text-slate-400">{t("sent")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                ${Number(result.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("commission")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                ${Number(result.commissionAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("receiverGetsAmount")}</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                ${Number(result.amountPayable).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("collectedFromSender")}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                ${Number(result.totalCharged).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            {result.commissionMode === "PAID_BY_SENDER"
              ? t("commissionPaidBySenderNote")
              : t("commissionDeductedNote")}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <a
              href={`/branch/receipt/${result.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity"
            >
              <i className="fa-solid fa-print text-xs" />
              {t("printReceipt")}
            </a>

            <a
                          
              href={`https://wa.me/?text=${encodeURIComponent(
                `${t("moneyTransferReceipt")}\n\n${t("senderLabel")}: ${result.senderName}\n${t("receiverLabel")}: ${result.receiverName}\n${t("amountSentLabel")}: $${Number(
                  result.amountSent
                ).toLocaleString("en-US", { minimumFractionDigits: 2 })}\n${t("receiverGetsAmount")}: $${Number(
                  result.amountPayable
                ).toLocaleString("en-US", { minimumFractionDigits: 2 })}\n${t("collectedFromSender")}: $${Number(
                  result.totalCharged
                ).toLocaleString("en-US", { minimumFractionDigits: 2 })}\n${t("pickupCodeLabel")}: ${result.pickupCode}\n\n${t("receiptLabel")}: ${
                  typeof window !== "undefined" ? window.location.origin : ""
                }/branch/receipt/${result.id}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity"
            >
              <i className="fa-brands fa-whatsapp text-sm" />
              WhatsApp
            </a>
          </div>
          <button
            onClick={startNewTransfer}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity"
          >
            {t("newTransfer")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("newTransfer")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("sendMoneyToBranch")}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-5 card-hover">
        {formError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t("receivingBranch")}
          </label>
          <select
            required
            value={receiverBranchId}
            onChange={(e) => setReceiverBranchId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("selectBranch")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.location ? `— ${b.location}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("senderName")}
            </label>
            <input
              type="text"
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("senderIdOptional")}
            </label>
            <input
              type="text"
              value={senderIdNumber}
              onChange={(e) => setSenderIdNumber(e.target.value)}
              placeholder="National ID / Passport"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("receiverName")}
            </label>
            <input
              type="text"
              required
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t("whoPaysCommission")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCommissionMode("DEDUCTED")}
              className={`rounded-xl border px-4 py-3 text-sm font-medium text-left transition-colors ${
                commissionMode === "DEDUCTED"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
              }`}
            >
              <div className="font-semibold">{t("deductFromAmount")}</div>
              <div className="text-xs opacity-80 mt-0.5">{t("receiverGetsLess")}</div>
            </button>
            <button
              type="button"
              onClick={() => setCommissionMode("PAID_BY_SENDER")}
              className={`rounded-xl border px-4 py-3 text-sm font-medium text-left transition-colors ${
                commissionMode === "PAID_BY_SENDER"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
              }`}
            >
              <div className="font-semibold">{t("senderPaysExtra")}</div>
              <div className="text-xs opacity-80 mt-0.5">{t("receiverGetsFullAmount")}</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t("amountToSend")}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amountSent}
              onChange={(e) => setAmountSent(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-lg font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {previewError && <p className="text-xs text-red-500 mt-2">{previewError}</p>}

          {preview && (
            <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("commission")}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  ${preview.commissionAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receiver gets</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ${preview.amountPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sender pays</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  ${preview.totalCharged.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !preview}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? t("creatingTransfer") : t("newTransfer")}
        </button>
      </form>
    </div>
  );
}
