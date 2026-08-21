"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/client-auth";
import { QRCodeSVG } from "qrcode.react";

type Transaction = {
  id: string;
  senderName: string;
  senderIdNumber: string | null;
  receiverName: string;
  amountSent: number;
  commissionAmount: number;
  amountPayable: number;
  pickupCode: string;
  qrCodeData: string;
  status: string;
  createdAt: string;
  senderBranch: { name: string; address: string | null; phone: string | null; branchCode: string | null; location: string | null };
  receiverBranch: { name: string; address: string | null; phone: string | null; branchCode: string | null; location: string | null };
  createdBy: { name: string };
};

export default function ReceiptPage() {
  const params = useParams();
  const transactionId = params.transactionId as string;

  const [tx, setTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/api/transactions/${transactionId}`);
        if (!res.ok) throw new Error("Receipt not found");
        const data = await res.json();
        setTx(data.transaction);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    if (transactionId) load();
  }, [transactionId]);

  useEffect(() => {
    if (tx) {
      const timeout = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timeout);
    }
  }, [tx]);

  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (!tx) return <p className="p-8 text-sm text-slate-500">Loading receipt...</p>;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-6 print:shadow-none print:rounded-none print:max-w-none print:p-2">
        <div className="text-center mb-4 pb-4 border-b border-dashed border-slate-300">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-2">
            <i className="fa-solid fa-building-columns text-white text-sm" />
          </div>
          <p className="font-bold text-slate-900">{tx.senderBranch.name}</p>
          {tx.senderBranch.branchCode && <p className="text-xs text-slate-400">{tx.senderBranch.branchCode}</p>}
          {tx.senderBranch.address && <p className="text-xs text-slate-500 mt-1">{tx.senderBranch.address}</p>}
          {tx.senderBranch.phone && <p className="text-xs text-slate-500">{tx.senderBranch.phone}</p>}
        </div>

        <p className="text-center text-xs text-slate-400 mb-4">
          {new Date(tx.createdAt).toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <div className="space-y-1.5 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Sender</span>
            <span className="font-medium text-slate-900">{tx.senderName}</span>
          </div>
          {tx.senderIdNumber && (
            <div className="flex justify-between">
              <span className="text-slate-500">Sender ID</span>
              <span className="font-medium text-slate-900">{tx.senderIdNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Receiver</span>
            <span className="font-medium text-slate-900">{tx.receiverName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Receiving branch</span>
            <span className="font-medium text-slate-900">{tx.receiverBranch.name}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Amount sent</span>
            <span className="font-medium text-slate-900">
              ${Number(tx.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Commission</span>
            <span className="font-medium text-slate-900">
              ${Number(tx.commissionAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-100">
            <span>Payable</span>
            <span>${Number(tx.amountPayable).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 pt-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Pickup Code</p>
          <p className="text-2xl font-bold tracking-widest text-slate-900 font-mono mb-4">{tx.pickupCode}</p>
          <div className="flex justify-center mb-2">
            <QRCodeSVG value={tx.qrCodeData} size={120} />
          </div>
          <p className="text-[10px] text-slate-400">Present this code or QR at {tx.receiverBranch.name} to collect</p>
        </div>

        <p className="text-center text-[10px] text-slate-300 mt-4 pt-3 border-t border-dashed border-slate-300">
          Issued by {tx.createdBy.name} — Port Transfer System
        </p>

                <div className="grid grid-cols-2 gap-2 mt-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="bg-slate-900 text-white text-sm font-medium rounded-xl py-2.5"
          >
            <i className="fa-solid fa-print mr-2" />
            Print
          </button>
          
           <a  href={`https://wa.me/?text=${encodeURIComponent(
              `Money transfer receipt\n\nSender: ${tx.senderName}\nReceiver: ${tx.receiverName}\nAmount: $${Number(tx.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}\nPickup Code: ${tx.pickupCode}\n\nReceipt: ${typeof window !== "undefined" ? window.location.href : ""}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium rounded-xl py-2.5"
          >
            <i className="fa-brands fa-whatsapp" />
            Share
          </a>
        </div>
      </div>
    </div>
  );
}
