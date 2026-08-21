"use client";

import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip);

type Props = {
  completed: number;
  pending: number;
  refunded: number;
};

export default function StatusDonutChart({ completed, pending, refunded }: Props) {
  const categories = [
    { name: "Completed", color: "#14b8a6", value: completed },
    { name: "Pending", color: "#f59e0b", value: pending },
    { name: "Refunded", color: "#64748b", value: refunded },
  ];

  const total = completed + pending + refunded;

  const data = {
    labels: categories.map((c) => c.name),
    datasets: [
      {
        data: categories.map((c) => c.value),
        backgroundColor: categories.map((c) => c.color),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { size: 13, family: "Inter" },
        bodyFont: { size: 12, family: "Inter" },
        padding: 12,
        cornerRadius: 10,
      },
    },
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 lg:p-5 shadow-sm card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Transaction Status</h3>
        <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
          Today
        </span>
      </div>
      <div className="h-36 lg:h-44 flex items-center justify-center">
        {total > 0 ? (
          <Doughnut data={data} options={options} />
        ) : (
          <p className="text-sm text-slate-400">No transactions yet</p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 text-xs">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </div>
            <span className="font-medium text-slate-500 dark:text-slate-400">{cat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}