"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type Day = { label: string; sent: number; completed: number };

export default function VolumeTrendChart({ days }: { days: Day[] }) {
  const chartData = {
    labels: days.map((d) => d.label),
    datasets: [
      {
        label: "Sent",
        data: days.map((d) => d.sent),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: "Completed",
        data: days.map((d) => d.completed),
        borderColor: "#14b8a6",
        backgroundColor: "rgba(20,184,166,0.05)",
        fill: true,
        tension: 0.4,
        borderDash: [5, 5] as number[],
        pointBackgroundColor: "#14b8a6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, padding: 20, font: { size: 12, family: "Inter" } },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { size: 13, family: "Inter" },
        bodyFont: { size: 12, family: "Inter" },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx: TooltipItem<"line">) =>
            `${ctx.dataset.label || ""}: $${(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(148,163,184,0.1)" },
        ticks: {
          callback: (val: string | number) => "$" + Number(val).toLocaleString(),
          font: { size: 11, family: "Inter" },
        },
      },
      x: { grid: { display: false }, ticks: { font: { size: 11, family: "Inter" } } },
    },
    interaction: { intersect: false, mode: "index" as const },
  };

  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-4 lg:p-5 shadow-sm card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Transaction Volume</h3>
        <span className="text-xs text-slate-400">Last 7 days</span>
      </div>
      <div className="h-48 lg:h-56">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}