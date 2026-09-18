"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/client-auth";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Allocation = { branchName: string; amount: number; distributedAt: string; note: string | null };

type LedgerEntry = {
  id: string;
  type: "CASH_IN" | "CASH_OUT";
  date: string;
  cashIn: number;
  cashOut: number;
  runningBalance: number;
  code?: string;
  commodityName?: string;
  description?: string;
  recordedByName?: string;
  remainingBalance?: number;
  allocations?: Allocation[];
  branchName?: string;
  note?: string;
};

type AvailableSource = { id: string; code: string; commodityName: string; remaining: number };

type PartnerBalance = {
  partner: { id: string; name: string; email: string };
  balance: number;
  totalCashIn: number;
  totalCashOut: number;
  ledger: LedgerEntry[];
  availableSources: AvailableSource[];
};

type BranchOption = { id: string; name: string };

export default function PartnerDetailPage() {
  const { partnerId } = useParams() as { partnerId: string };
  const [data, setData] = useState<PartnerBalance | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFundForm, setShowFundForm] = useState(false);
  const [commodityName, setCommodityName] = useState("");
  const [cashValue, setCashValue] = useState("");
  const [fundDescription, setFundDescription] = useState("");
  const [fundSubmitting, setFundSubmitting] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  const [showDistForm, setShowDistForm] = useState(false);
  const [fundSourceId, setFundSourceId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [distAmount, setDistAmount] = useState("");
  const [distNote, setDistNote] = useState("");
  const [distSubmitting, setDistSubmitting] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // All Branch Transactions view
  const [showAllTx, setShowAllTx] = useState(false);
  const [txBranchFilter, setTxBranchFilter] = useState("");
  const [txFrom, setTxFrom] = useState("");
  const [txTo, setTxTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [balRes, branchRes] = await Promise.all([
        apiFetch(`/api/partners/${partnerId}/balance`),
        apiFetch("/api/branches"),
      ]);
      if (!balRes.ok) throw new Error("Failed to load partner data");
      const json: PartnerBalance = await balRes.json();
      setData(json);
      const firstCashIn = json.ledger.find((e) => e.type === "CASH_IN");
      setSelectedId(firstCashIn?.id ?? null);
      if (branchRes.ok) setBranches((await branchRes.json()).branches);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (partnerId) load(); }, [partnerId]);

  async function handleFundSource(e: React.FormEvent) {
    e.preventDefault();
    setFundError(null);
    setFundSubmitting(true);
    try {
      const res = await apiFetch("/api/fund-sources", {
        method: "POST",
        body: JSON.stringify({ partnerId, commodityName, cashValue: Number(cashValue), description: fundDescription || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.formErrors?.[0] || d.error || "Failed to record fund source");
      setCommodityName(""); setCashValue(""); setFundDescription("");
      setShowFundForm(false);
      await load();
    } catch (err) {
      setFundError((err as Error).message);
    } finally {
      setFundSubmitting(false);
    }
  }

  async function handleDistribution(e: React.FormEvent) {
    e.preventDefault();
    setDistError(null);

    const source = data?.availableSources.find((s) => s.id === fundSourceId);
    if (!source) {
      setDistError("Select which cash-in this distribution comes from.");
      return;
    }
    if (Number(distAmount) > source.remaining) {
      setDistError(`Amount exceeds the remaining balance of ${source.code} (${fmt(source.remaining)}).`);
      return;
    }

    setDistSubmitting(true);
    try {
      const res = await apiFetch("/api/partner-distributions", {
        method: "POST",
        body: JSON.stringify({ partnerId, fundSourceId, branchId, amount: Number(distAmount), note: distNote || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.formErrors?.[0] || d.error || "Failed to record distribution");
      setFundSourceId(""); setBranchId(""); setDistAmount(""); setDistNote("");
      setShowDistForm(false);
      await load();
    } catch (err) {
      setDistError((err as Error).message);
    } finally {
      setDistSubmitting(false);
    }
  }

  function fmt(n: number) {
    return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // ---- Cycle-based Cash In History (one row per fund-source cycle) ----
  const cycles = useMemo(() => {
    if (!data) return [];
    return data.ledger
      .filter((e) => e.type === "CASH_IN")
      .map((e) => {
        const remaining = e.remainingBalance ?? e.cashIn;
        const distributed = e.cashIn - remaining;
        const complete = remaining === 0;
        return { ...e, remaining, distributed, complete };
      });
  }, [data]);

  // ---- All Branch Transactions (every CASH_OUT entry, filterable) ----
  const cashOutEntries = useMemo(() => {
    if (!data) return [];
    return data.ledger.filter((e) => e.type === "CASH_OUT");
  }, [data]);

  const filteredCashOut = useMemo(() => {
    return cashOutEntries.filter((e) => {
      if (txBranchFilter && e.branchName !== txBranchFilter) return false;
      const d = new Date(e.date).getTime();
      if (txFrom && d < new Date(txFrom).getTime()) return false;
      if (txTo && d > new Date(txTo).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    });
  }, [cashOutEntries, txBranchFilter, txFrom, txTo]);

  const filteredTotal = useMemo(
    () => filteredCashOut.reduce((sum, e) => sum + (e.cashOut || 0), 0),
    [filteredCashOut]
  );

  function exportExcel() {
    if (!data) return;
    const rows = cycles.map((e) => ({
      Code: e.code,
      Date: fmtDate(e.date),
      "Cash In": e.cashIn || "",
      "Cash Out": e.distributed || "",
      Balance: e.remaining,
      Detail: e.commodityName,
      Status: e.complete ? "Completed" : "Pending",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `${data.partner.name.replace(/\s+/g, "_")}_ledger.xlsx`);
  }

  function exportPdf() {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${data.partner.name} — Cash Ledger`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Balance: ${fmt(data.balance)}  |  Total In: ${fmt(data.totalCashIn)}  |  Total Out: ${fmt(data.totalCashOut)}`, 14, 23);

    autoTable(doc, {
      startY: 28,
      head: [["Code", "Date", "Cash In", "Cash Out", "Balance", "Detail", "Status"]],
      body: cycles.map((e) => [
        e.code ?? "",
        fmtDate(e.date),
        e.cashIn ? fmt(e.cashIn) : "—",
        e.distributed ? fmt(e.distributed) : "—",
        fmt(e.remaining),
        e.commodityName ?? "",
        e.complete ? "Completed" : "Pending",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`${data.partner.name.replace(/\s+/g, "_")}_ledger.pdf`);
  }

  function exportAllTxExcel() {
    if (!data) return;
    const rows = filteredCashOut.map((e) => ({
      Date: fmtDate(e.date),
      Branch: e.branchName ?? "",
      "Issued By": e.recordedByName ?? "",
      Amount: e.cashOut,
    }));
    rows.push({ Date: "", Branch: "", "Issued By": "Total", Amount: filteredTotal } as any);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Branch Transactions");
    XLSX.writeFile(wb, `${data.partner.name.replace(/\s+/g, "_")}_branch_transactions.xlsx`);
  }

  function exportAllTxPdf() {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${data.partner.name} — Branch Transactions`, 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Date", "Branch", "Issued By", "Amount"]],
      body: [
        ...filteredCashOut.map((e) => [
          fmtDate(e.date),
          e.branchName ?? "—",
          e.recordedByName ?? "—",
          fmt(e.cashOut),
        ]),
        ["", "", "Total", fmt(filteredTotal)],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      didParseCell: (hookData) => {
        if (hookData.row.index === filteredCashOut.length) {
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.save(`${data.partner.name.replace(/\s+/g, "_")}_branch_transactions.pdf`);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading partner...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const selected = data.ledger.find((e) => e.id === selectedId && e.type === "CASH_IN");
  const selectedSource = data.availableSources.find((s) => s.id === fundSourceId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
        <a href="/admin/partners" className="hover:underline">Partners</a>
        <i className="fa-solid fa-chevron-right text-[10px]" />
        <span>{data.partner.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{data.partner.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{data.partner.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowFundForm(!showFundForm); setShowDistForm(false); }} className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity">
            <i className="fa-solid fa-arrow-down text-xs" />
            Cash In
          </button>
          <button onClick={() => { setShowDistForm(!showDistForm); setShowFundForm(false); }} className="flex items-center gap-2 bg-rose-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity">
            <i className="fa-solid fa-arrow-up text-xs" />
            Cash Out
          </button>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-xs text-white/70 uppercase tracking-wide mb-2">Current Balance</p>
          <p className="text-2xl font-bold">{fmt(data.balance)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Cash In</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(data.totalCashIn)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Distributed</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{fmt(data.totalCashOut)}</p>
        </div>
      </div>

      {/* Cash In form */}
      {showFundForm && (
        <form onSubmit={handleFundSource} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 card-hover">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Record Cash In (Fund Source)</h3>
          {fundError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fundError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Commodity</label>
              <input type="text" required value={commodityName} onChange={(e) => setCommodityName(e.target.value)} placeholder="e.g. Gold, Oil, USD" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cash Value ($)</label>
              <input type="number" required min="0.01" step="0.01" value={cashValue} onChange={(e) => setCashValue(e.target.value)} placeholder="e.g. 20000" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description (optional)</label>
              <input type="text" value={fundDescription} onChange={(e) => setFundDescription(e.target.value)} placeholder="e.g. 10kg gold at $2000/kg" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={fundSubmitting} className="bg-green-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50">{fundSubmitting ? "Saving..." : "Record Cash In"}</button>
            <button type="button" onClick={() => setShowFundForm(false)} className="text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Cash Out / Distribution form */}
      {showDistForm && (
        <form onSubmit={handleDistribution} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 card-hover">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Record Cash Out (Distribute to Branch)</h3>
          {distError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{distError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cash-In Source</label>
              <select required value={fundSourceId} onChange={(e) => setFundSourceId(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a cash-in</option>
                {data.availableSources.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} · {s.commodityName} · {fmt(s.remaining)} left</option>
                ))}
              </select>
              {selectedSource && (
                <p className="text-xs text-slate-400 mt-1">Remaining: {fmt(selectedSource.remaining)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Branch</label>
              <select required value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a branch</option>
                {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount ($)</label>
              <input type="number" required min="0.01" step="0.01" max={selectedSource?.remaining} value={distAmount} onChange={(e) => setDistAmount(e.target.value)} placeholder="e.g. 5000" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Note (optional)</label>
              <input type="text" value={distNote} onChange={(e) => setDistNote(e.target.value)} placeholder="e.g. Weekly operating cash" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={distSubmitting} className="bg-rose-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50">{distSubmitting ? "Saving..." : "Distribute Cash"}</button>
            <button type="button" onClick={() => setShowDistForm(false)} className="text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Export + All Branch Transactions buttons */}
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={() => setShowAllTx(!showAllTx)} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <i className="fa-solid fa-table-list text-blue-600" />
          {showAllTx ? "Hide" : "View"} All Branch Transactions
        </button>
        <button onClick={exportExcel} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <i className="fa-solid fa-file-excel text-green-600" />
          Export Excel
        </button>
        <button onClick={exportPdf} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <i className="fa-solid fa-file-pdf text-red-600" />
          Export PDF
        </button>
      </div>

      {/* All Branch Transactions panel */}
      {showAllTx && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover mb-6">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">All Branch Transactions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Every distribution made to every branch</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={txBranchFilter} onChange={(e) => setTxBranchFilter(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-700 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All branches</option>
                {branches.map((b) => (<option key={b.id} value={b.name}>{b.name}</option>))}
              </select>
              <input type="date" value={txFrom} onChange={(e) => setTxFrom(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-700 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={txTo} onChange={(e) => setTxTo(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-700 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {(txBranchFilter || txFrom || txTo) && (
                <button onClick={() => { setTxBranchFilter(""); setTxFrom(""); setTxTo(""); }} className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2">
                  Clear
                </button>
              )}
              <button onClick={exportAllTxExcel} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <i className="fa-solid fa-file-excel text-green-600" />
                {/* Excel */}
              </button>
              <button onClick={exportAllTxPdf} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <i className="fa-solid fa-file-pdf text-red-600" />
                {/* PDF */}
              </button>
            </div>
          </div>

          {filteredCashOut.length === 0 ? (
            <p className="text-sm text-slate-400 p-4">No transactions match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Branch</th>
                    <th className="px-4 py-2.5 font-medium">Issued By</th>
                    <th className="px-4 py-2.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCashOut.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{e.branchName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{e.recordedByName ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">{fmt(e.cashOut)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-900/30">
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200" colSpan={3}>Total</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{fmt(filteredTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ledger + Distribution drill-down */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cycle-based Cash In History table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Cash In History</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click a row to see how that cycle was distributed</p>
          </div>
          {cycles.length === 0 ? (
            <p className="text-sm text-slate-400 p-4">No activity recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-2.5 font-medium">Code</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Cash In</th>
                    <th className="px-4 py-2.5 font-medium">Cash Out</th>
                    <th className="px-4 py-2.5 font-medium">Balance</th>
                    <th className="px-4 py-2.5 font-medium text-center">Cycle</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((e) => {
                    const isSelected = e.id === selectedId;
                    return (
                      <tr
                        key={e.id}
                        onClick={() => setSelectedId(e.id)}
                        className={`border-b border-slate-50 dark:border-slate-700/50 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{e.code}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(e.date)}</td>
                        <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">
                          {e.cashIn ? `+${fmt(e.cashIn)}` : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-rose-600 dark:text-rose-400">
                          {e.distributed ? `-${fmt(e.distributed)}` : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{fmt(e.remaining)}</td>
                        <td className="px-4 py-3 text-center">
                          {e.complete ? (
                            <i className="fa-solid fa-circle-check text-green-500" title="Cycle complete" />
                          ) : (
                            <i className="fa-regular fa-clock text-slate-300 dark:text-slate-500" title="In progress" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Distribution History — drill-down for the selected cycle */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Distribution History</h3>
            {selected && (
              <p className="text-xs text-slate-400 mt-0.5">
                {selected.code} · {selected.commodityName} · {new Date(selected.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>

          {!selected ? (
            <p className="text-sm text-slate-400 p-4">Select a cash-in row to see its distribution breakdown.</p>
          ) : !selected.allocations || selected.allocations.length === 0 ? (
            <p className="text-sm text-slate-400 p-4">None of this cash has been distributed yet. Remaining: {fmt(selected.remainingBalance ?? 0)}</p>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {selected.allocations.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{a.branchName}</p>
                    <p className="text-xs text-slate-400">
                      {a.note || new Date(a.distributedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">-{fmt(a.amount)}</p>
                </div>
              ))}
              {(selected.remainingBalance ?? 0) > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/30">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Undistributed</p>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{fmt(selected.remainingBalance ?? 0)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
