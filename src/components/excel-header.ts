import * as XLSX from "xlsx";

// Drop-in replacement for XLSX.utils.json_to_sheet(rows):
// puts "TIMS B", the report title and the date on top, then the table from row 5.
export function sheetWithHeader(
  rows: Record<string, unknown>[],
  title: string,
  subtitle?: string
) {
  const header: unknown[][] = [
    ["TIMS B"],
    [title],
    [subtitle ?? `Generated ${new Date().toLocaleString("en-US")}`],
    [],
  ];
  const ws = XLSX.utils.aoa_to_sheet(header);
  XLSX.utils.sheet_add_json(ws, rows, { origin: "A5" });
  const keys = rows.length ? Object.keys(rows[0]) : [];
  ws["!cols"] = keys.map((k) => ({ wch: Math.max(k.length + 2, 16) }));
  return ws;
}