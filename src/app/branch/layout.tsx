"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, getUser } from "@/lib/client-auth";
import { useTheme } from "@/context/ThemeContext";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/branch", icon: "fa-house" },
  { label: "New Transfer", href: "/branch/new-transfer", icon: "fa-paper-plane" },
  { label: "Complete Pickup", href: "/branch/complete", icon: "fa-hand-holding-dollar" },
  { label: "Refund", href: "/branch/refund", icon: "fa-rotate-left" },
  { label: "Transactions", href: "/branch/transactions", icon: "fa-right-left" },
];

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [userName, setUserName] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    const user = getUser();
    if (user) setUserName(user.name);
    setToday(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col shrink-0">
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-building-columns text-white text-sm" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">Port Transfer</span>
        </div>

        <nav className="mt-4 px-3 flex-1">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-3">
            Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                  active
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-[3px] border-blue-500"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 m-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
          <p className="text-xs text-white/70 mb-1">Signed in as</p>
          <p className="text-sm font-semibold truncate">{userName || "..."}</p>
          <button
            onClick={logout}
            className="mt-3 w-full text-xs bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-3 py-1.5"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <i className="fa-regular fa-calendar text-slate-400" />
            {today}
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <i className="fa-solid fa-sun text-slate-500" />
              ) : (
                <i className="fa-solid fa-moon text-yellow-400" />
              )}
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
              {userName ? userName.charAt(0).toUpperCase() : "?"}
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
              aria-label="Logout"
            >
              <i className="fa-solid fa-right-from-bracket text-slate-500 dark:text-slate-300 group-hover:text-red-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
