"use client";

import React from "react";

type Metric = { label: string; count: number; amount: number; gradient: string; icon: string };

export default function SummaryCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 mb-6">
      {metrics.map((m) => (
        <div
          key={m.label}
          className={`card-hover bg-gradient-to-br ${m.gradient} rounded-2xl p-5 text-white shadow-lg cursor-pointer active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center justify-between mb-4">
            <i className={`fa-solid ${m.icon} text-white/70`} />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {m.count} txn{m.count === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-2xl font-bold mb-1">
            ${m.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-white/70 tracking-wide">{m.label}</p>
        </div>
      ))}
    </div>
  );
}