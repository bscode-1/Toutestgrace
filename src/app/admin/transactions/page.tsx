"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-auth";
import DatePicker from "@/components/DatePicker";
import Pagination from "@/components/Pagination";
import * as XLSX from "xlsx";


type Tx = {
  id: string;
  senderName: string;
  receiverName: string;
  amountSent: number;
  commissionAmount: number;
  amountPayable: number;
  pickupCode: string;
  status: "PENDING" | "COMPLETED" | "REFUNDED";
  createdAt: string;
  senderBranch: { name: string };
  receiverBranch: { name: string };
  createdBy: { name: string };
};

type BranchOption = { id: string; name: string };

const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REFUNDED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [status, setStatus] = useState("");
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (branchId) params.set("branchId", branchId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (search) params.set("search", search);

      const res = await apiFetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load transactions");
      const data = await res.json();
      setTransactions(data.transactions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, branchId, from, to, search]);

  useEffect(() => {
    apiFetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data) => setBranches(data.branches || []));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadTransactions, 300);
    return () => clearTimeout(timeout);
  }, [loadTransactions]);

  useEffect(() => {
    setPage(1);
  }, [status, branchId, from, to, search]);

  function exportToExcel() {
    const rows = transactions.map((tx) => ({
      "Pickup Code": tx.pickupCode,
      "Sender": tx.senderName,
      "Sender Branch": tx.senderBranch.name,
      "Receiver": tx.receiverName,
      "Receiver Branch": tx.receiverBranch.name,
      "Amount Sent": Number(tx.amountSent),
      "Commission": Number(tx.commissionAmount),
      "Amount Payable": Number(tx.amountPayable),
      "Status": tx.status,
      "Created By": tx.createdBy?.name || "—",
      "Date": new Date(tx.createdAt).toLocaleString("en-US"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `transactions-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {transactions.length} result{transactions.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={exportToExcel}
          disabled={transactions.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <i className="fa-solid fa-file-excel text-xs" />
          Export to Excel
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-6 card-hover">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or pickup code"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <DatePicker value={from} onChange={setFrom} placeholder="Any date" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <DatePicker value={to} onChange={setTo} placeholder="Any date" />
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading transactions...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && transactions.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm">
          <i className="fa-solid fa-right-left text-3xl text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No transactions match these filters.</p>
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Pickup Code</th>
                <th className="px-5 py-3 font-medium">Route</th>
                <th className="px-5 py-3 font-medium">Sender / Receiver</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created By</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{tx.pickupCode}</td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {tx.senderBranch.name} → {tx.receiverBranch.name}
                  </td>
                  <td className="px-5 py-4 text-slate-900 dark:text-white">
                    {tx.senderName} → {tx.receiverName}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      ${Number(tx.amountSent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-400">
                      Commission ${Number(tx.commissionAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[tx.status]}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{tx.createdBy?.name || "—"}</td>
                  <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={page}
            totalItems={transactions.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}