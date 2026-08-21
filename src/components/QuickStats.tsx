"use client";

import React from "react";

type Stat = { icon: string; label: string; value: string; color: string; bg: string };

export default function QuickStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm card-hover"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
            <i className={`${s.icon} ${s.color} text-sm`} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="text-sm font-bold">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}