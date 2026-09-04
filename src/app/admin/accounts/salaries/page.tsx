"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Salary = {
  id: string;
  staffName: string;
  amount: number;
  period: string;
  paidAt: string;
  paidBy: { name: string };
};

type StaffOption = { id: string; name: string };

export default function SalariesPage() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [staffId, setStaffId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  async function loadSalaries() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const res = await apiFetch(`/api/salaries?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load salaries");
      setSalaries((await res.json()).salaries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiFetch("/api/users")
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((data) => setStaff(data.users || []));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadSalaries, 300);
    return () => clearTimeout(timeout);
  }, [filterFrom, filterTo]);

  function handleStaffSelect(id: string) {
    setStaffId(id);
    const found = staff.find((s) => s.id === id);
    if (found) setStaffName(found.name);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/salaries", {
        method: "POST",
        body: JSON.stringify({
          staffId: staffId || undefined,
          staffName,
          amount: Number(amount),
          period,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || data.error || "Failed to record salary payment");
      setStaffId("");
      setStaffName("");
      setAmount("");
      setPeriod("");
      setShowForm(false);
      await loadSalaries();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const total = salaries.reduce((sum, s) => sum + Number(s.amount), 0);

  function exportToExcel() {
    const rows = salaries.map((s) => ({
      Staff: s.staffName,
      Period: s.period,
      Amount: Number(s.amount),
      "Paid By": s.paidBy.name,
      Date: new Date(s.paidAt).toLocaleDateString("en-US"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Salaries");
    XLSX.writeFile(workbook, `salaries-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportToPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Salary Payments Report", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 25);
    doc.setTextColor(0);
    doc.text(`Total: $${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Staff", "Period", "Amount", "Date"]],
      body: salaries.map((s) => [
        s.staffName,
        s.period,
        `$${Number(s.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        new Date(s.paidAt).toLocaleDateString("en-US"),
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
    });

    doc.save(`salaries-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Salaries</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {salaries.length} payment(s) — ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            disabled={salaries.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <i className="fa-solid fa-file-excel text-xs" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            disabled={salaries.length === 0}
            className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <i className="fa-solid fa-file-pdf text-xs" />
            PDF
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
          >
            <i className="fa-solid fa-plus text-xs" />
            Pay Salary
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 card-hover"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Record a salary payment</h3>
          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Staff member
              </label>
              <select
                value={staffId}
                onChange={(e) => handleStaffSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select staff (or type name below)</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Staff name
              </label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Amount
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Period
              </label>
              <input
                type="text"
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. August 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Pay Salary"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-6 card-hover">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading salaries...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && salaries.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm">
          <i className="fa-solid fa-money-check-dollar text-3xl text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No salary payments recorded yet.</p>
        </div>
      )}

      {!loading && salaries.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Staff</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{s.staffName}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{s.period}</td>
                    <td className="px-5 py-4 font-semibold text-rose-600 dark:text-rose-400">
                      -${Number(s.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {new Date(s.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
