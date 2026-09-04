"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";

type Category = {
  id: string;
  name: string;
  createdAt: string;
};

function displayName(name: string): string {
  return name.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/expense-categories");
      if (!res.ok) throw new Error("Failed to load categories");
      setCategories((await res.json()).categories);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/expense-categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || data.error || "Failed to add category");
      setName("");
      setShowForm(false);
      await loadCategories();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`Delete the "${displayName(cat.name)}" category?`)) return;
    try {
      const res = await apiFetch(`/api/expense-categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category");
      await loadCategories();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <a href="/admin/accounts/expenses" className="hover:underline">
              Expenses
            </a>
            <i className="fa-solid fa-chevron-right text-[10px]" />
            <span>Categories</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Expense Categories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} available
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
        >
          <i className="fa-solid fa-plus text-xs" />
          New Category
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 card-hover"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add a new category</h3>
          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Internet, Fuel, Insurance"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Category"}
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

      {loading && <p className="text-sm text-slate-500">Loading categories...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && categories.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{displayName(c.name)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => deleteCategory(c)}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      aria-label="Delete"
                    >
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}