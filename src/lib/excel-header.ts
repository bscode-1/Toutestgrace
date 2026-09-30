import * as XLSX from "xlsx";

export const COMPANY_NAME = "TIMS B";

type Row = Record<string, string | number | null | undefined>;

// Accepts (rows, title) or (title, rows)
export function sheetWithHeader(a: Row[] | string, b?: Row[] | string): XLSX.WorkSheet {
  const rows = (Array.isArray(a) ? a : (b as Row[])) ?? [];
  const title = (typeof a === "string" ? a : (b as string)) ?? "Report";

  const head = [[COMPANY_NAME], [title], [`Generated: ${new Date().toLocaleString()}`], []];
  const ws = XLSX.utils.aoa_to_sheet(head);
  XLSX.utils.sheet_add_json(ws, rows, { origin: head.length });

  const cols = rows[0] ? Object.keys(rows[0]) : [];
  ws["!cols"] = cols.map((c) => ({
    wch: rows.reduce((m, r) => Math.max(m, String(r[c] ?? "").length), c.length) + 2,
  }));
  return ws;
}