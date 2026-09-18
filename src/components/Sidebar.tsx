"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUser, apiFetch } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";
import type { PermissionKey } from "@/lib/permission-constants";

type NavItem = {
  label: string;
  icon: string;
  href: string;
  // Omit permKey for items that should always be visible (e.g. Dashboard).
  permKey?: PermissionKey;
};

export default function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [permissions, setPermissions] = useState<Partial<Record<PermissionKey, boolean>> | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { t } = useLanguage();

  const mainNav: NavItem[] = [
    { label: t("dashboard"), icon: "fa-solid fa-house", href: "/admin" },
    { label: "Partners", icon: "fa-solid fa-handshake", href: "/admin/partners", permKey: "VIEW_PARTNERS" },
    { label: t("branches"), icon: "fa-solid fa-building-columns", href: "/admin/branches", permKey: "VIEW_BRANCHES" },
    { label: t("staff"), icon: "fa-solid fa-users", href: "/admin/staff", permKey: "VIEW_STAFF" },
    { label: t("topups"), icon: "fa-solid fa-credit-card", href: "/admin/topups", permKey: "VIEW_TOPUPS" },
    { label: t("transactions"), icon: "fa-solid fa-right-left", href: "/admin/transactions", permKey: "VIEW_TRANSACTIONS" },
    { label: t("commissionReport"), icon: "fa-solid fa-right-left", href: "/admin/reports/commission", permKey: "VIEW_COMMISSION_REPORT" },
    { label: t("accounts"), icon: "fa-solid fa-building-columns", href: "/admin/accounts", permKey: "VIEW_ACCOUNTS_OVERVIEW" },
    { label: t("expenses"), icon: "fa-solid fa-file-invoice-dollar", href: "/admin/accounts/expenses", permKey: "VIEW_EXPENSES" },
    { label: t("salaries"), icon: "fa-solid fa-money-check-dollar", href: "/admin/accounts/salaries", permKey: "VIEW_SALARIES" },
    { label: "Roles", icon: "fa-solid fa-user-tag", href: "/admin/roles", permKey: "VIEW_ROLES" },
    { label: "Permissions", icon: "fa-solid fa-shield-halved", href: "/admin/permissions", permKey: "VIEW_PERMISSIONS" },
    { label: t("auditLog"), icon: "fa-solid fa-clipboard-list", href: "/admin/audit-log", permKey: "VIEW_AUDIT_LOG" },
  ];

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setIsSuperAdmin(u?.role === "SUPER_ADMIN");

    // Super admins bypass the permission system entirely — no need to fetch.
    if (u?.role === "SUPER_ADMIN") {
      setPermissions(null);
      return;
    }

    let cancelled = false;
    apiFetch("/api/permissions/me")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load permissions"))))
      .then((data) => {
        if (!cancelled) setPermissions(data.permissions ?? {});
      })
      .catch(() => {
        // Fail closed on nav visibility if the permissions fetch errors —
        // the backend route guards are the real enforcement either way.
        if (!cancelled) setPermissions({});
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function canSee(item: NavItem): boolean {
    if (!item.permKey) return true; // e.g. Dashboard
    if (isSuperAdmin) return true;
    if (!permissions) return false; // still loading — hide gated items until we know
    return permissions[item.permKey] !== false; // permissive default, matches hasPermission()
  }

  const visibleNav = mainNav.filter(canSee);

  return (
    <aside className="w-64 h-full bg-white dark:bg-slate-800 flex flex-col justify-between overflow-y-auto shrink-0">
      <div>
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-building-columns text-white text-sm" />
          </div>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">Tout est Grace</span>
        </div>

        <nav className="mt-4 px-3">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-3">
            Menu
          </p>
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 text-left
                  ${active
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-[3px] border-blue-500"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }
                `}
              >
                <i className={`${item.icon} w-5 text-center`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 m-3 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-slate-700 dark:to-slate-700 rounded-xl">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Signed in as</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || "..."}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {isSuperAdmin ? "Super Admin" : user?.role ?? "..."}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
