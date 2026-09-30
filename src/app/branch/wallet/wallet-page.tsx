// src/app/branch/wallet/page.tsx — teller's own view
"use client";


import { useEffect, useState } from "react";
//import { getUser } from "@/lib/auth-client"; // adjust to whatever your existing client-side user helper is actually named

type LedgerEntry = {
  id: string;
  type: "DEPOSIT_COLLECTED" | "WITHDRAWAL_PAID" | "REFUND_PAID" | "MANAGER_FUNDING" | "TELLER_RETURN";
  amount: number;
  createdAt: string;
};

const LABELS: Record<LedgerEntry["type"], string> = {
  DEPOSIT_COLLECTED: "Deposit collected",
  WITHDRAWAL_PAID: "Withdrawal paid out",
  REFUND_PAID: "Refund paid out",
  MANAGER_FUNDING: "Funding from manager",
  TELLER_RETURN: "Cash returned to manager",
};

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/tellers/me/ledger", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setEntries(data.entries);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">My Wallet</h1>
      <div className="text-3xl font-bold mb-6">{balance?.toLocaleString() ?? 0}</div>
      <div className="space-y-2">
        {entries.map((e) => {
          const negative = e.type === "WITHDRAWAL_PAID" || e.type === "REFUND_PAID";
          return (
            <div key={e.id} className="flex items-center justify-between border-b py-2">
              <div>
                <div>{LABELS[e.type]}</div>
                <div className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</div>
              </div>
              <div className={negative ? "text-red-600" : "text-green-600"}>
                {negative ? "-" : "+"}{e.amount.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}