"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-auth";
import Pagination from "@/components/Pagination";

type LogEntry = {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    performedByUser: { name: string } | null;
    performedByAdmin: { name: string } | null;
};

const entityIcon: Record<string, string> = {
    TRANSACTION: "fa-right-left",
    BRANCH: "fa-building-columns",
    APP_USER: "fa-user",
    COMMISSION_TIER: "fa-percent",
    TOPUP: "fa-credit-card",
};

const actionStyle: Record<string, string> = {
    CREATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REFUNDED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
    ISSUED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    MANAGER_ASSIGNED_AND_ACTIVATED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

function formatLabel(key: string): string {
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
}

function formatValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return "—";
    const lower = key.toLowerCase();

    if (typeof value === "number") {
        if (lower.includes("amount") || lower.includes("percent") || lower.includes("commission")) {
            return lower.includes("percent") ? `${value}%` : `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
        }
        return String(value);
    }

    if (typeof value === "string") {
        // Looks like a UUID — shorten it
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            return `${value.slice(0, 8)}…`;
        }
        return value;
    }

    if (typeof value === "boolean") return value ? "Yes" : "No";

    return JSON.stringify(value);
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const [entityType, setEntityType] = useState("");
    const [search, setSearch] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (entityType) params.set("entityType", entityType);
            if (search) params.set("search", search);
            if (from) params.set("from", from);
            if (to) params.set("to", to);

            const res = await apiFetch(`/api/audit-log?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load audit log");
            const data = await res.json();
            setLogs(data.logs);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [entityType, search, from, to]);

    useEffect(() => {
        setPage(1);
    }, [entityType, search, from, to]);

    useEffect(() => {
        const timeout = setTimeout(loadLogs, 300);
        return () => clearTimeout(timeout);
    }, [loadLogs]);



    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Audit Log</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {logs.length} action{logs.length === 1 ? "" : "s"} recorded
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-6 card-hover">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Search entity ID</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Paste an ID"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Entity type</label>
                        <select
                            value={entityType}
                            onChange={(e) => setEntityType(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All</option>
                            <option value="TRANSACTION">Transaction</option>
                            <option value="BRANCH">Branch</option>
                            <option value="APP_USER">Staff</option>
                            <option value="COMMISSION_TIER">Commission Tier</option>
                            <option value="TOPUP">Topup</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
                        />
                    </div>
                </div>
            </div>

            {loading && <p className="text-sm text-slate-500">Loading audit log...</p>}
            {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
                    {error}
                </p>
            )}

            {!loading && logs.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm">
                    <i className="fa-solid fa-clipboard-list text-3xl text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No matching audit entries.</p>
                </div>
            )}

            {!loading && logs.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                                <th className="px-5 py-3 font-medium">Entity</th>
                                <th className="px-5 py-3 font-medium">Action</th>
                                <th className="px-5 py-3 font-medium">Performed By</th>
                                <th className="px-5 py-3 font-medium">Date</th>
                                <th className="px-5 py-3 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr
                                        className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <i className={`fa-solid ${entityIcon[log.entityType] || "fa-circle-dot"} text-slate-400 text-xs`} />
                                                <span className="font-medium text-slate-900 dark:text-white">{log.entityType}</span>
                                                <span className="text-xs text-slate-400 font-mono">{log.entityId.slice(0, 8)}…</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`text-xs font-medium px-2.5 py-1 rounded-full ${actionStyle[log.action] || "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                                                    }`}
                                            >
                                                {log.action.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                                            {log.performedByAdmin?.name || log.performedByUser?.name || "System"}
                                        </td>
                                        <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <i
                                                className={`fa-solid fa-chevron-${expandedId === log.id ? "up" : "down"} text-slate-300 text-xs`}
                                            />
                                        </td>
                                    </tr>
                                    {expandedId === log.id && log.metadata && (
                                        <tr className="bg-slate-50 dark:bg-slate-700/30">
                                            <td colSpan={5} className="px-5 py-3">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                                                    {Object.entries(log.metadata).map(([key, value]) => (
                                                        <div key={key}>
                                                            <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                                                                {formatLabel(key)}
                                                            </p>
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                {formatValue(key, value)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    </div>
                    <Pagination currentPage={page} totalItems={logs.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
                </div>
            )}
        </div>
    );
}