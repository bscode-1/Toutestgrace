"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";

type BranchOption = { id: string; name: string; location: string | null };

type CreatedTransaction = {
  id: string;
  pickupCode: string;
  senderName: string;
  receiverName: string;
  amountSent: number;
  commissionAmount: number;
  amountPayable: number;
  qrCodeData: string;
};

export default function NewTransferPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [receiverBranchId, setReceiverBranchId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderIdNumber, setSenderIdNumber] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [amountSent, setAmountSent] = useState("");

  const [preview, setPreview] = useState<{ commissionAmount: number; amountPayable: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedTransaction | null>(null);

  useEffect(() => {
    apiFetch("/api/branches/directory")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data) => setBranches(data.branches || []));
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
        const res = await apiFetch(`/api/branch/me/commission-preview?amount=${amount}`);
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
  }, [amountSent]);

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
    setPreview(null);
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 text-center card-hover">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-check text-green-600 dark:text-green-400 text-xl" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Transfer Created</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Give this pickup code to {result.senderName} to share with {result.receiverName}
          </p>

          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-6 mb-6">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Pickup Code</p>
            <p className="text-3xl font-bold tracking-widest text-slate-900 dark:text-white font-mono">
              {result.pickupCode}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left mb-6">
            <div>
              <p className="text-xs text-slate-400">Sent</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                ${Number(result.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Commission</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                ${Number(result.commissionAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Payable</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                ${Number(result.amountPayable).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">

            <a href={`/branch/receipt/${result.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity"
            >
              <i className="fa-solid fa-print text-xs" />
              Print
            </a>

            <a href={`https://wa.me/?text=${encodeURIComponent(
              `Money transfer receipt\n\nSender: ${result.senderName}\nReceiver: ${result.receiverName}\nAmount: $${Number(result.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}\nPickup Code: ${result.pickupCode}\n\nReceipt: ${typeof window !== "undefined" ? window.location.origin : ""}/branch/receipt/${result.id}`
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
            New Transfer
          </button>


        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">New Transfer</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Send money to another branch</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-5 card-hover">
        {formError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Receiving branch
          </label>
          <select
            required
            value={receiverBranchId}
            onChange={(e) => setReceiverBranchId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a branch</option>
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
              Sender name
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
              Sender ID number (optional)
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
              Receiver name
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
            Amount to send
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
            <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Commission</p>
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
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !preview}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "Creating transfer..." : "Create Transfer"}
        </button>
      </form>
    </div>
  );
}
