export const PERMISSION_KEYS = [
  "CREATE_TRANSFER",
  "COMPLETE_PICKUP",
  "PROCESS_REFUND",
  "VIEW_TRANSACTIONS",
  "MANAGE_TRANSACTIONS",

  "VIEW_PARTNERS",
  "MANAGE_PARTNERS",
  "VIEW_PARTNER_BALANCE",
  "VIEW_FUND_SOURCES",
  "MANAGE_FUND_SOURCES",
  "VIEW_PARTNER_DISTRIBUTIONS",
  "RECORD_DISTRIBUTION",

  "VIEW_BRANCHES",
  "MANAGE_BRANCHES",
  "VIEW_STAFF",
  "MANAGE_STAFF",

  "VIEW_TOPUPS",
  "MANAGE_TOPUPS",

  "VIEW_COMMISSION_TIERS",
  "MANAGE_COMMISSION_TIERS",
  "VIEW_COMMISSION_REPORT",

  "VIEW_ACCOUNTS_OVERVIEW",
  "VIEW_EXPENSES",
  "MANAGE_EXPENSES",
  "MANAGE_EXPENSE_CATEGORIES",
  "VIEW_SALARIES",
  "MANAGE_SALARIES",

  "VIEW_REPORTS",
  "EXPORT_REPORTS",
  "VIEW_AUDIT_LOG",

  "VIEW_ROLES",
  "MANAGE_ROLES",
  "VIEW_PERMISSIONS",
  "MANAGE_PERMISSIONS",
  "RESET_STAFF_PASSWORD",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  CREATE_TRANSFER: "Create new transfers",
  COMPLETE_PICKUP: "Complete pickups (pay out)",
  PROCESS_REFUND: "Process refunds",
  VIEW_TRANSACTIONS: "View transaction history",
  MANAGE_TRANSACTIONS: "Edit / cancel transactions (admin)",

  VIEW_PARTNERS: "View partners list",
  MANAGE_PARTNERS: "Create / edit partners",
  VIEW_PARTNER_BALANCE: "View own partner balance & history",
  VIEW_FUND_SOURCES: "View partner cash-in history",
  MANAGE_FUND_SOURCES: "Record partner cash-in",
  VIEW_PARTNER_DISTRIBUTIONS: "View cash distributions to branches",
  RECORD_DISTRIBUTION: "Record cash distributions to branches",

  VIEW_BRANCHES: "View branches",
  MANAGE_BRANCHES: "Create / edit / deactivate branches",
  VIEW_STAFF: "View staff list",
  MANAGE_STAFF: "Create / edit / deactivate staff",

  VIEW_TOPUPS: "View topups",
  MANAGE_TOPUPS: "Create topups",

  VIEW_COMMISSION_TIERS: "View commission tiers",
  MANAGE_COMMISSION_TIERS: "Edit commission tiers",
  VIEW_COMMISSION_REPORT: "View commission report",

  VIEW_ACCOUNTS_OVERVIEW: "View accounts overview (cash at hand)",
  VIEW_EXPENSES: "View expenses",
  MANAGE_EXPENSES: "Add / edit expenses",
  MANAGE_EXPENSE_CATEGORIES: "Manage expense categories",
  VIEW_SALARIES: "View salary payments",
  MANAGE_SALARIES: "Record salary payments",

  VIEW_REPORTS: "View reports hub",
  EXPORT_REPORTS: "Export reports (Excel / PDF)",
  VIEW_AUDIT_LOG: "View audit log",

  VIEW_ROLES: "View roles",
  MANAGE_ROLES: "Create / edit custom roles",
  VIEW_PERMISSIONS: "View permissions page",
  MANAGE_PERMISSIONS: "Toggle role permissions",

  RESET_STAFF_PASSWORD: "Reset staff password",
};