"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUser } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";



export default function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const { t } = useLanguage();  
  const mainNav = [
    { label: t("dashboard"), icon: "fa-solid fa-house", href: "/admin" },
    { label: t("branches"), icon: "fa-solid fa-building-columns", href: "/admin/branches" },
    { label: t("staff"), icon: "fa-solid fa-users", href: "/admin/staff" },
    { label: t("topups"), icon: "fa-solid fa-credit-card", href: "/admin/topups" },
    { label: t("transactions"), icon: "fa-solid fa-right-left", href: "/admin/transactions" },
    { label: t("commissionReport"), icon: "fa-solid fa-right-left", href: "/admin/reports/commission" },
    { label: t("accounts"), icon: "fa-solid fa-building-columns", href: "/admin/accounts" },
    { label: t("expenses"), icon: "fa-solid fa-file-invoice-dollar", href: "/admin/accounts/expenses" },
    { label: t("salaries"), icon: "fa-solid fa-money-check-dollar", href: "/admin/accounts/salaries" },
    { label: t("auditLog"), icon: "fa-solid fa-clipboard-list", href: "/admin/audit-log" },
    { label: "Permissions", icon: "fa-solid fa-shield-halved", href: "/admin/permissions" },
    ({ label: "Roles", icon: "fa-solid fa-user-tag", href: "/admin/roles" })
  ];

  useEffect(() => {
    setUser(getUser());
  }, []);

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
          {mainNav.map((item) => {
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
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}