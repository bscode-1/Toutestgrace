const ROLES: Record<string, { label: string; className: string }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  BRANCH_MANAGER: {
    label: "Manager",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  TELLER: {
    label: "Teller",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
};

export default function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return null;

  const known = ROLES[role];
  // fallback for any custom role: "SOME_ROLE" -> "Some Role"
  const label =
    known?.label ??
    role
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const className =
    known?.className ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}