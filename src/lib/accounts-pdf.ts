import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BranchSituation } from "./branch-accounts";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function downloadBranchesPdf(rows: BranchSituation[], periodLabel: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text("TIMS B - Branches Situation Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Period: ${periodLabel}`, 14, 22);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);
  doc.setFontSize(8);
  doc.text(
    "Period figures follow the selected dates. Manager Cash, Tellers Cash, Cash On Hand and Cash To Return are current balances.",
    14,
    32
  );

  const keys: (keyof BranchSituation)[] = [
    "partnerReceived", "capitalReturned", "deposits", "withdrawals", "refunds",
    "commission", "expenses", "salaries", "netProfit",
    "managerCash", "tellerCash", "cashOnHand", "cashToReturn",
  ];
  const total = (k: keyof BranchSituation) =>
    rows.reduce((a, r) => a + Number(r[k] as number), 0);

  autoTable(doc, {
    startY: 36,
    head: [[
      "Branch", "Partner In", "Cap. Returned", "Deposits", "Withdrawals", "Refunds",
      "Commission", "Expenses", "Salaries", "Net Profit",
      "Manager Cash", "Tellers Cash", "Cash On Hand", "To Return",
    ]],
    body: rows.map((r) => [r.name, ...keys.map((k) => fmt(Number(r[k] as number)))]),
    foot: [["All Branches", ...keys.map((k) => fmt(total(k)))]],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 41, 59] },
    footStyles: { fillColor: [226, 232, 240], textColor: 20 },
    columnStyles: Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [i + 1, { halign: "right" as const }])
    ),
  });

  const safe = periodLabel.replace(/[^a-zA-Z0-9-]+/g, "_");
  doc.save(`branches-situation_${safe}.pdf`);
}