"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  paidAt: string;
  branch: { name: string } | null;
  paidBy: { name: string };
};

type BranchOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

function displayCategory(name: string): string {
  return name.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [branchId, setBranchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  async function loadCategories() {
    const res = await apiFetch("/api/expense-categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
      if (!category && data.categories.length > 0) setCategory(data.categories[0].name);
    }
  }

  async function loadExpenses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const res = await apiFetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load expenses");
      setExpenses((await res.json()).expenses);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiFetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data) => setBranches(data.branches || []));
    loadCategories();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadExpenses, 300);
    return () => clearTimeout(timeout);
  }, [filterCategory, filterFrom, filterTo]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          category,
          description: description || undefined,
          amount: Number(amount),
          branchId: branchId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || data.error || "Failed to record expense");
      setDescription("");
      setAmount("");
      setBranchId("");
      setShowForm(false);
      await loadExpenses();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError(null);
    setCategorySubmitting(true);
    try {
      const res = await apiFetch("/api/expense-categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || data.error || "Failed to add category");
      setNewCategoryName("");
      setShowCategoryForm(false);
      await loadCategories();
      setCategory(data.category.name);
    } catch (err) {
      setCategoryError((err as Error).message);
    } finally {
      setCategorySubmitting(false);
    }
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  function exportToExcel() {
    const rows = expenses.map((e) => ({
      Category: displayCategory(e.category),
      Description: e.description || "",
      Branch: e.branch?.name || "Company-wide",
      Amount: Number(e.amount),
      "Paid By": e.paidBy.name,
      Date: new Date(e.paidAt).toLocaleDateString("en-US"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, `expenses-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportToPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Expenses Report", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 25);
    doc.setTextColor(0);
    doc.text(`Total: $${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Category", "Description", "Branch", "Amount", "Date"]],
      body: expenses.map((e) => [
        displayCategory(e.category),
        e.description || "—",
        e.branch?.name || "Company-wide",
        `$${Number(e.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        new Date(e.paidAt).toLocaleDateString("en-US"),
      ]),
      headStyles: { fillColor: [225, 29, 72] },
      styles: { fontSize: 9 },
    });

    doc.save(`expenses-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {expenses.length} record(s) — ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            disabled={expenses.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <i className="fa-solid fa-file-excel text-xs" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            disabled={expenses.length === 0}
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
            Record Expense
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 card-hover"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Record a new expense</h3>
          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                <div className="flex items-center gap-3">

                  <a href="/admin/accounts/categories"
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
                  >
                    Manage
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(!showCategoryForm)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + New category
                  </button>
                </div>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {displayCategory(c.name)}
                  </option>
                ))}
              </select>
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
                placeholder="e.g. 300"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Branch (optional — leave blank for company-wide)
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Company-wide</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. August rent"
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
              {submitting ? "Saving..." : "Record Expense"}
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

      {showCategoryForm && (
        <form
          onSubmit={handleCreateCategory}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 card-hover"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add a new category</h3>
          {categoryError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {categoryError}
            </div>
          )}
          <input
            type="text"
            required
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Internet, Fuel"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={categorySubmitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {categorySubmitting ? "Adding..." : "Add Category"}
            </button>
            <button
              type="button"
              onClick={() => setShowCategoryForm(false)}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-6 card-hover">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {displayCategory(c.name)}
                </option>
              ))}
            </select>
          </div>
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

      {loading && <p className="text-sm text-slate-500">Loading expenses...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && expenses.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm">
          <i className="fa-solid fa-file-invoice-dollar text-3xl text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No expenses recorded yet.</p>
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Branch</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                      {displayCategory(e.category)}
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{e.description || "—"}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {e.branch?.name || "Company-wide"}
                    </td>
                    <td className="px-5 py-4 font-semibold text-rose-600 dark:text-rose-400">
                      -${Number(e.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {new Date(e.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
