"use client";

import React, { useState, useRef, useEffect } from "react";

type Props = {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function DatePicker({ value, onChange, placeholder = "Select date" }: Props) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pickDay(day: number) {
    const picked = new Date(year, month, day);
    const iso = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, "0")}-${String(picked.getDate()).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  }

  function isSameDay(day: number) {
    return !!selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm font-medium text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <i className="fa-regular fa-calendar text-slate-400 text-xs shrink-0" />
        <span className={value ? "text-slate-900 dark:text-white" : "text-slate-400"}>
          {selected
            ? selected.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
            >
              <i className="fa-solid fa-chevron-left text-xs" />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{monthLabel}</span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
            >
              <i className="fa-solid fa-chevron-right text-xs" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-medium text-slate-400 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) =>
              day === null ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`h-8 rounded-lg text-xs font-medium transition-colors ${
                    isSameDay(day)
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {day}
                </button>
              )
            )}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-3 w-full text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}