"use client";

const REPORTS = [
  {
    label: "Users",
    description: "Staff accounts, roles, and status across every branch",
    icon: "fa-users",
    gradient: "from-blue-500 to-indigo-600",
    href: "/admin/staff",
  },
  {
    label: "Audit",
    description: "Every action taken in the system, who did it, and when",
    icon: "fa-clipboard-list",
    gradient: "from-slate-500 to-slate-700",
    href: "/admin/audit-log",
  },
  {
    label: "Transactions",
    description: "Filter by status — all, completed, pending, or refunded",
    icon: "fa-right-left",
    gradient: "from-cyan-500 to-blue-600",
    href: "/admin/transactions",
  },
  {
    label: "Commission",
    description: "Commission earned, filterable by date and branch",
    icon: "fa-percent",
    gradient: "from-emerald-500 to-teal-600",
    href: "/admin/reports/commission",
  },
  {
    label: "Cash at Hand",
    description: "The company's exact current financial position",
    icon: "fa-sack-dollar",
    gradient: "from-green-500 to-emerald-600",
    href: "/admin/accounts",
  },
  {
    label: "Expenses",
    description: "Bills, rent, and other costs — filterable by type and date",
    icon: "fa-file-invoice-dollar",
    gradient: "from-rose-400 to-pink-600",
    href: "/admin/accounts/expenses",
  },
  {
    label: "Salary",
    description: "Every salary payment made, filterable by date",
    icon: "fa-money-check-dollar",
    gradient: "from-indigo-500 to-purple-600",
    href: "/admin/accounts/salaries",
  },
];

export default function ReportsHubPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every report in the system, in one place
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          
          <a key={r.href}
            href={r.href}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm card-hover hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
          >
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center mb-4 text-white`}
            >
              <i className={`fa-solid ${r.icon}`} />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{r.label}</p>
            <p className="text-xs text-slate-400">{r.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}