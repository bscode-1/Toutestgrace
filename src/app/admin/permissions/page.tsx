"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";

type PermissionRow = {
  id: string;
  role: string;
  permissionKey: string;
  enabled: boolean;
};

const PERMISSION_LABELS: Record<string, string> = {
  CREATE_TRANSFER: "Create new transfers",
  COMPLETE_PICKUP: "Complete pickups (pay out)",
  PROCESS_REFUND: "Process refunds",
  VIEW_TRANSACTIONS: "View transaction history",
  EXPORT_REPORTS: "Export reports (Excel / PDF)",
};

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);
type RoleInfo = { id: string; name: string; isSystem: boolean };

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleInfo[]>([]);

  async function load() {
  setLoading(true);
  try {
    const [permsRes, rolesRes] = await Promise.all([
      apiFetch("/api/permissions"),
      apiFetch("/api/roles"),
    ]);
    if (!permsRes.ok) throw new Error("Failed to load permissions");
    setPermissions((await permsRes.json()).permissions);
    if (rolesRes.ok) setRoles((await rolesRes.json()).roles);
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    load();
  }, []);


  function isEnabled(role: string, key: string): boolean {
    const row = permissions.find((p) => p.role === role && p.permissionKey === key);
    return row ? row.enabled : true;
  }

  async function toggle(role: string, key: string) {
    const current = isEnabled(role, key);
    const cellId = `${role}:${key}`;
    setSavingKey(cellId);

    // optimistic update
    setPermissions((prev) => {
      const exists = prev.some((p) => p.role === role && p.permissionKey === key);
      if (exists) {
        return prev.map((p) =>
          p.role === role && p.permissionKey === key ? { ...p, enabled: !current } : p
        );
      }
      return [...prev, { id: cellId, role, permissionKey: key, enabled: !current }];
    });

    try {
      const res = await apiFetch("/api/permissions", {
        method: "PATCH",
        body: JSON.stringify({ role, permissionKey: key, enabled: !current }),
      });
      if (!res.ok) throw new Error("Failed to update permission");
    } catch (err) {
      alert((err as Error).message);
      load(); // revert on failure
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Roles & Permissions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Control which actions each staff role is allowed to perform
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading permissions...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </p>
      )}

      {!loading && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden card-hover">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Action</th>
                {roles.map((role) => (
  <th key={role.id} className="px-5 py-3 font-medium text-center">
    {role.name.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
  </th>
))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_KEYS.map((key) => (
                <tr
                  key={key}
                  className="border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                >
                  <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                    {PERMISSION_LABELS[key]}
                  </td>
                  {roles.map((role) => {
  const enabled = isEnabled(role.name, key);
  const cellId = `${role.name}:${key}`;
  return (
    <td key={role.id} className="px-5 py-4">
                        <div className="flex justify-center">
                                                    <button
                            type="button"
                            onClick={() => toggle(role.name, key)}
                            disabled={savingKey === cellId}
                            style={{
                              width: "44px",
                              height: "24px",
                              borderRadius: "9999px",
                              position: "relative",
                              border: "1px solid",
                              borderColor: enabled ? "#4f46e5" : "#94a3b8",
                              backgroundColor: enabled ? "#4f46e5" : "#cbd5e1",
                              transition: "background-color 0.2s",
                              opacity: savingKey === cellId ? 0.5 : 1,
                              cursor: "pointer",
                            }}
                            aria-label={`Toggle ${PERMISSION_LABELS[key]} for ${role.name}`}
                          >
                            <span
                              style={{
                                position: "absolute",
                                top: "2px",
                                left: enabled ? "22px" : "2px",
                                width: "18px",
                                height: "18px",
                                borderRadius: "9999px",
                                backgroundColor: "white",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                transition: "left 0.2s",
                              }}
                            />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        Changes apply immediately — a signed-in staff member will lose access to a disabled action on
        their next request, without needing to log out.
      </p>
    </div>
  );
}
