"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/client-auth";
import * as XLSX from "xlsx";

type BranchDetail = {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  phone: string | null;
  branchCode: string | null;
  status: string;
  manager: { name: string; email: string } | null;
  currency: { code: string; symbol: string } | null;
  createdAt: string;
};

type Tx = {
  id: string;
  senderName: string;
  receiverName: string;
  amountSent: number;
  commissionAmount: number;
  status: string;
  senderBranchId: string;
  createdAt: string;
  senderBranch: { name: string };
  receiverBranch: { name: string };
};

type Topup = {
  id: string;
  branchId: string;
  amount: number;
  receiptNumber: string;
  createdAt: string;
};

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  isActive: boolean;
};

type Tier = {
  id: string;
  minAmount: number;
  maxAmount: number;
  commissionType: string;
  commissionPercent: number | null;
  commissionFlatAmount: number | null;
};

export default function BranchDetailPage() {
  const params = useParams();
  const branchId = params.branchId as string;

  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const [showAssignManager, setShowAssignManager] = useState(false);
  const [eligibleManagers, setEligibleManagers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [assigningManager, setAssigningManager] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);


  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchCode, setEditBranchCode] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);


  function openEditForm() {
    if (!branch) return;
    setEditName(branch.name);
    setEditLocation(branch.location || "");
    setEditAddress(branch.address || "");
    setEditPhone(branch.phone || "");
    setEditBranchCode(branch.branchCode || "");
    setEditError(null);
    setEditing(true);
  }

  async function openAssignManager() {
  setAssignError(null);
  setSelectedManagerId("");
  try {
    const res = await apiFetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      // Only staff already at this branch, with the BRANCH_MANAGER role
      const eligible = data.users.filter(
        (u: { branchId: string; role: string }) => u.branchId === branchId && u.role === "BRANCH_MANAGER"
      );
      setEligibleManagers(eligible);
    }
  } catch {
    setEligibleManagers([]);
  }
  setShowAssignManager(true);
}

async function confirmAssignManager(e: React.FormEvent) {
  e.preventDefault();
  setAssigningManager(true);
  setAssignError(null);
  try {
    const res = await apiFetch(`/api/branches/${branchId}/assign-manager`, {
      method: "POST",
      body: JSON.stringify({ managerId: selectedManagerId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to assign manager");
    setBranch(data.branch);
    setShowAssignManager(false);
  } catch (err) {
    setAssignError((err as Error).message);
  } finally {
    setAssigningManager(false);
  }
}

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await apiFetch(`/api/branches/${branchId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          location: editLocation || undefined,
          address: editAddress || undefined,
          phone: editPhone || undefined,
          branchCode: editBranchCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update branch");
      setBranch(data.branch);
      setEditing(false);
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleStatus() {
    if (!branch) return;
    const nextStatus = branch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await apiFetch(`/api/branches/${branchId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change status");
      setBranch(data.branch);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [branchRes, balanceRes, txRes, topupRes, staffRes, tiersRes] = await Promise.all([
          apiFetch(`/api/branches/${branchId}`),
          apiFetch(`/api/branches/${branchId}/balance`),
          apiFetch(`/api/transactions?branchId=${branchId}&limit=50`),
          apiFetch(`/api/topups`),
          apiFetch(`/api/users`),
          apiFetch(`/api/branches/${branchId}/commission-tiers`),
        ]);

        if (!branchRes.ok) throw new Error("Branch not found");
        setBranch((await branchRes.json()).branch);

        if (balanceRes.ok) setBalance((await balanceRes.json()).balance);
        if (txRes.ok) setTransactions((await txRes.json()).transactions);
        if (topupRes.ok) {
          const all = (await topupRes.json()).topups as Topup[];
          setTopups(all.filter((t) => t.branchId === branchId));
        }
        if (staffRes.ok) {
          const all = (await staffRes.json()).users as Staff[];
          setStaff(all.filter((s) => s.branchId === branchId));
        }
        if (tiersRes.ok) setTiers((await tiersRes.json()).tiers);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (branchId) load();
  }, [branchId]);

  if (loading) return <p className="text-sm text-slate-500">Loading branch...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!branch) return null;

  const currencySymbol = branch.currency?.symbol || "$";

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">

          <a href={`/admin/branches/${branchId}/commission`}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <i className="fa-solid fa-percent text-xs" />
            Commission Tiers
          </a>
          <button
            onClick={openEditForm}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <i className="fa-solid fa-pen text-xs" />
            Edit
          </button>
          <button
            onClick={toggleStatus}
            className={`flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2.5 transition-colors ${branch.status === "ACTIVE"
                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
              }`}
          >
            <i className={`fa-solid ${branch.status === "ACTIVE" ? "fa-pause" : "fa-play"} text-xs`} />
            {branch.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </div>

        <a href={`/admin/branches/${branchId}/commission`}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <i className="fa-solid fa-percent text-xs" />
          Commission Tiers
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-xs text-white/70 uppercase tracking-wide mb-2">Ledger Balance</p>
          <p className="text-2xl font-bold">
            {currencySymbol}
            {balance !== null ? Number(balance).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
          </p>
        </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Manager</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {branch.manager ? branch.manager.name : <span className="text-amber-500">Unassigned</span>}
              </p>
              <p className="text-xs text-slate-400">{branch.manager?.email}</p>
            </div>
            <button
              onClick={openAssignManager}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              {branch.manager ? "Change" : "Assign"}
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Phone</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{branch.phone || "—"}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Address</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{branch.address || "—"}</p>
        </div>
      </div>

      {/* <a       
        href={`/admin/branches/${branchId}/commission`}
        className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 card-hover hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <i className="fa-solid fa-percent text-indigo-500 text-sm" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Commission Tiers</p>
            <p className="text-xs text-slate-400">{tiers.length} tier{tiers.length === 1 ? "" : "s"} configured</p>
          </div>
        </div>
        <i className="fa-solid fa-chevron-right text-slate-300 dark:text-slate-600 text-xs" />
      </a> */}

      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Staff</h3>
          {staff.length === 0 ? (
            <p className="text-sm text-slate-400">No staff assigned to this branch.</p>
          ) : (
            <div className="space-y-3">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.role === "BRANCH_MANAGER" ? "Branch Manager" : "Teller"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Topup History</h3>
          {topups.length === 0 ? (
            <p className="text-sm text-slate-400">No topups issued to this branch.</p>
          ) : (
            <div className="space-y-3">
              {topups.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white font-mono text-xs">{t.receiptNumber}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    +{currencySymbol}
                    {Number(t.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div> */}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Transactions</h3>
          <button
            onClick={() => {
              const rows = transactions.map((tx) => {
                const isSender = tx.senderBranchId === branchId;
                return {
                  "Transfer": `${tx.senderName} → ${tx.receiverName}`,
                  "Sent Amount": isSender ? Number(tx.amountSent) : 0,
                  "Received Amount": isSender ? 0 : Number(tx.amountSent),
                  "Commission": isSender ? Number(tx.commissionAmount ?? 0) : 0,
                  "Status": tx.status,
                  "Date": new Date(tx.createdAt).toLocaleString("en-US"),
                };
              });
              const worksheet = XLSX.utils.json_to_sheet(rows);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
              XLSX.writeFile(workbook, `${branch?.name || "branch"}-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`);
            }}
            disabled={transactions.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white text-xs font-medium rounded-lg px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <i className="fa-solid fa-file-excel text-xs" />
            Export to Excel
          </button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400 p-5">No transactions involving this branch yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Transfer</th>
                <th className="px-5 py-3 font-medium">Sent</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isSender = tx.senderBranchId === branchId;
                return (
                  <tr key={tx.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                    <td className="px-5 py-3 text-slate-900 dark:text-white">
                      {tx.senderName} → {tx.receiverName}
                    </td>
                    <td className="px-5 py-3 font-semibold text-rose-600 dark:text-rose-400">
                      {isSender
                        ? `${currencySymbol}${Number(tx.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 font-semibold text-green-600 dark:text-green-400">
                      {!isSender
                        ? `${currencySymbol}${Number(tx.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{tx.status}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

              {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Edit Branch</h3>

            {editError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {editError}
              </div>
            )}

            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Branch name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Branch code
                  </label>
                  <input
                    type="text"
                    value={editBranchCode}
                    onChange={(e) => setEditBranchCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Full address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {showAssignManager && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Assign Manager</h3>
            <p className="text-xs text-slate-400 mb-4">
              Only staff already created at this branch with the Branch Manager role can be assigned.
            </p>

            {assignError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {assignError}
              </div>
            )}

            {eligibleManagers.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4">
                No eligible Branch Manager accounts found for this branch yet. Create one first from the{" "}
                <a href="/admin/staff" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Staff page
                </a>
                .
              </div>
            ) : (
              <form onSubmit={confirmAssignManager} className="space-y-4">
                <select
                  required
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a manager</option>
                  {eligibleManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.email}
                    </option>
                  ))}
                </select>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={assigningManager}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {assigningManager ? "Assigning..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignManager(false)}
                    className="text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {eligibleManagers.length === 0 && (
              <button
                onClick={() => setShowAssignManager(false)}
                className="w-full text-sm font-medium text-slate-500 dark:text-slate-400 px-5 py-2.5 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}