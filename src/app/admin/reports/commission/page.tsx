"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-auth";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type BranchBreakdown = {
  branchId: string;
  branchName: string;
  commissionEarned: number;
  volume: number;
  transactionCount: number;
};

type Report = {
  period: { from: string; to: string };
  totalCommission: number;
  totalVolume: number;
  transactionCount: number;
  byBranch: BranchBreakdown[];
};

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}



const PRESETS = [
  { label: "Today", getRange: () => { const d = new Date(); return { from: toISODate(d), to: toISODate(d) }; } },
  { label: "This Week", getRange: () => { const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - d.getDay()); return { from: toISODate(start), to: toISODate(d) }; } },
  { label: "This Month", getRange: () => { const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1); return { from: toISODate(start), to: toISODate(d) }; } },
  { label: "Last 30 Days", getRange: () => { const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - 30); return { from: toISODate(start), to: toISODate(d) }; } },
];

export default function CommissionReportPage() {
  const [from, setFrom] = useState(PRESETS[2].getRange().from);
  const [to, setTo] = useState(PRESETS[2].getRange().to);
  const [activePreset, setActivePreset] = useState("This Month");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await apiFetch(`/api/reports/commission?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load commission report");
      setReport(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const range = preset.getRange();
    setFrom(range.from);
    setTo(range.to);
    setActivePreset(preset.label);
  }

  function exportToPDF() {
  if (!report) return;

  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Commission Report", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const fromLabel = new Date(report.period.from).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const toLabel = new Date(report.period.to).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  doc.text(`Period: ${fromLabel} — ${toLabel}`, 14, 25);
  doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 30);

  // Summary boxes
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Commission Earned: $${Number(report.totalCommission).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 14, 49);
  doc.text(`Total Volume Sent: $${Number(report.totalVolume).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 14, 55);
  doc.text(`Completed Transfers: ${report.transactionCount}`, 14, 61);

  // Breakdown table
  autoTable(doc, {
    startY: 70,
    head: [["Branch", "Transfers", "Volume Sent", "Commission Earned"]],
    body: report.byBranch.map((b) => [
      b.branchName,
      String(b.transactionCount),
      `$${Number(b.volume).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `$${Number(b.commissionEarned).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    ]),
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });

  doc.save(`commission-report-${report.period.from.slice(0, 10)}-to-${report.period.to.slice(0, 10)}.pdf`);
}

  return (
    <div>
            <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Commission Report</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Commission earned from completed transfers, by branch
          </p>
        </div>
        <button
          onClick={exportToPDF}
          disabled={!report}
          className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <i className="fa-solid fa-file-pdf text-xs" />
          Export to PDF
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-6 card-hover">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                activePreset === p.label
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setActivePreset("");
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setActivePreset("");
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading report...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-xs text-white/70 uppercase tracking-wide mb-2">Commission Earned</p>
              <p className="text-2xl font-bold">
                ${Number(report.totalCommission).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Volume Sent</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${Number(report.totalVolume).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Completed Transfers</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{report.transactionCount}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">By Branch</h3>
            </div>
            {report.byBranch.length === 0 ? (
              <p className="text-sm text-slate-400 p-5">No completed transfers in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">Branch</th>
                    <th className="px-5 py-3 font-medium">Transfers</th>
                    <th className="px-5 py-3 font-medium">Volume Sent</th>
                    <th className="px-5 py-3 font-medium">Commission Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byBranch.map((b) => (
                    <tr
                      key={b.branchId}
                      className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{b.branchName}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{b.transactionCount}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        ${Number(b.volume).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        ${Number(b.commissionEarned).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}