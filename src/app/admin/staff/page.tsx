"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";
import Pagination from "@/components/Pagination";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: "TELLER" | "BRANCH_MANAGER";
  isActive: boolean;
  branch: { id: string; name: string };
  createdAt: string;
};

type BranchOption = { id: string; name: string; managerId: string | null };

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"TELLER" | "BRANCH_MANAGER">("TELLER");
  const [branchId, setBranchId] = useState("");
  const [assignAsManager, setAssignAsManager] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [staffRes, branchesRes] = await Promise.all([
        apiFetch("/api/users"),
        apiFetch("/api/branches"),
      ]);
      if (!staffRes.ok) throw new Error("Failed to load staff");
      const staffData = await staffRes.json();
      setStaff(staffData.users);

      if (branchesRes.ok) {
        const branchData = await branchesRes.json();
        setBranches(branchData.branches);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role, branchId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.formErrors?.[0] || data.error || "Failed to create staff member");
      }
      const created = await res.json();

      if (role === "BRANCH_MANAGER" && assignAsManager) {
        const assignRes = await apiFetch(`/api/branches/${branchId}/assign-manager`, {
          method: "POST",
          body: JSON.stringify({ managerId: created.user.id }),
        });
        if (!assignRes.ok) {
          const data = await assignRes.json().catch(() => ({}));
          throw new Error(data.error || "Staff created, but failed to assign as manager");
        }
      }

      setName("");
      setEmail("");
      setPassword("");
      setRole("TELLER");
      setBranchId("");
      setAssignAsManager(false);
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Staff</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {staff.length} staff member{staff.length === 1 ? "" : "s"} across all branches
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
        >
          <i className="fa-solid fa-plus text-xs" />
          New Staff
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 card-hover"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add a staff member</h3>

          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grace Nakato"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="grace@branch.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Temporary password
              </label>
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "TELLER" | "BRANCH_MANAGER")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TELLER">Teller</option>
                <option value="BRANCH_MANAGER">Branch Manager</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Branch
              </label>
              <select
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.managerId ? "" : "(no manager)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {role === "BRANCH_MANAGER" && branchId && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={assignAsManager}
                onChange={(e) => setAssignAsManager(e.target.checked)}
                className="rounded"
              />
              Also assign as manager of this branch (activates it)
            </label>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Staff"}
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

      {loading && <p className="text-sm text-slate-500">Loading staff...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && staff.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm">
          <i className="fa-solid fa-users text-3xl text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No staff yet — add your first team member.</p>
        </div>
      )}

      {!loading && staff.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Branch</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{s.email}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        s.role === "BRANCH_MANAGER"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {s.role === "BRANCH_MANAGER" ? "Branch Manager" : "Teller"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{s.branch.name}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        s.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
                    </table>
          <Pagination
            currentPage={page}
            totalItems={staff.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}