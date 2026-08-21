"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUser } from "@/lib/client-auth";

const mainNav = [
  { label: "Dashboard", icon: "fa-solid fa-house", href: "/admin" },
  { label: "Branches", icon: "fa-solid fa-building-columns", href: "/admin/branches" },
  { label: "Staff", icon: "fa-solid fa-users", href: "/admin/staff" },
  { label: "Topups", icon: "fa-solid fa-credit-card", href: "/admin/topups" },
  { label: "Transactions", icon: "fa-solid fa-right-left", href: "/admin/transactions" },
  { label: "Audit Log", icon: "fa-solid fa-clipboard-list", href: "/admin/audit-log" },
];

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <aside
      className={`
        bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
        flex flex-col justify-between transition-all duration-300 overflow-y-auto shrink-0
        ${collapsed ? "w-0 overflow-hidden border-0" : "w-64"}
        lg:w-64 lg:relative lg:border-r
        fixed inset-y-0 left-0 z-40 lg:z-auto h-screen
      `}
    >
      <div>
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-building-columns text-white text-sm" />
          </div>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">Port Transfer</span>
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