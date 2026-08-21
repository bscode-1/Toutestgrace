"use client";

import React from "react";

type Tx = {
  id: string;
  senderName: string;
  receiverName: string;
  amountSent: number;
  status: string;
  senderBranch: { name: string };
  receiverBranch: { name: string };
  createdAt: string;
};

const statusStyle: Record<string, { bg: string; color: string; icon: string }> = {
  COMPLETED: { bg: "bg-green-100 dark:bg-green-900/30", color: "text-green-500", icon: "fa-solid fa-check" },
  PENDING: { bg: "bg-amber-100 dark:bg-amber-900/30", color: "text-amber-500", icon: "fa-solid fa-clock" },
  REFUNDED: { bg: "bg-slate-100 dark:bg-slate-700", color: "text-slate-500", icon: "fa-solid fa-rotate-left" },
};

export default function RecentTransactions({ transactions }: { transactions: Tx[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 lg:p-5 shadow-sm card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Recent Transactions</h3>
        <a href="/admin/transactions" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
          See All
        </a>
      </div>
      <div className="space-y-1">
        {transactions.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">No transactions yet</p>
        )}
        {transactions.map((tx) => {
          const style = statusStyle[tx.status] || statusStyle.PENDING;
          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bg}`}>
                <i className={`${style.icon} ${style.color} text-sm`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {tx.senderName} → {tx.receiverName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {tx.senderBranch.name} → {tx.receiverBranch.name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">
                  ${Number(tx.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400">{tx.status}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}