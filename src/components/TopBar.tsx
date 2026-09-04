"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { logout } from "@/lib/client-auth";
import { useLanguage } from "@/context/LanguageContext";

export default function TopBar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [showNotif, setShowNotif] = useState(false);
  const [today, setToday] = useState("");
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
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
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 shrink-0 relative">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          aria-label="Toggle menu"
        >
          <i className="fa-solid fa-bars text-slate-600 dark:text-slate-300" />
        </button>

        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
            <i className="fa-solid fa-building-columns text-blue-500 text-sm" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("allBranches")}</span>
              <span className="text-xs text-slate-400">• {t("systemOverview")}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <i className="fa-regular fa-calendar text-slate-400" />
            {today}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <a
          href="/admin/reports"
          className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
          aria-label="Reports"
          title="Reports"
        >
          <i className="fa-solid fa-chart-simple text-sm" />
        </a>
         <button
          onClick={() => setLanguage(language === "en" ? "fr" : "en")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
        >
          {language === "en" ? "FR" : "EN"}
        </button>
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

        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            aria-label="Notifications"
          >
            <i className="fa-solid fa-bell text-slate-500 dark:text-slate-300" />
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-sm">Notifications</h3>
              </div>
              <div className="p-4 text-sm text-slate-400">No new notifications</div>
            </div>
          )}
        </div>

        <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition" aria-label="Profile">
          <i className="fa-solid fa-user-circle text-xl text-slate-500 dark:text-slate-300" />
        </button>

        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
          aria-label="Logout"
        >
          <i className="fa-solid fa-right-from-bracket text-slate-500 dark:text-slate-300 group-hover:text-red-500" />
        </button>
      </div>
    </header>
  );
}