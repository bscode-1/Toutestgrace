"use client";

import CapitalActivity from "@/components/branch/CapitalActivity";

export default function CommissionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Commission & Partner Transactions
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Commission earned on transactions, and cash received from or returned to partners.
        </p>
      </div>
      <CapitalActivity />
    </div>
  );
}