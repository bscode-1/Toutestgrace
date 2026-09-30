"use client";

import { useEffect, useMemo, useState } from "react";


type Row = {
  id: string;
  recordedAt: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  recordedByName: string;
};
type P = { id: string; name: string };
type Cap = { cashOnHand: number; toTransfer: number; commission: number };

const PAGE_SIZE = 15;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (n: number) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (d: string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export default function CapitalReturnsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [partners, setPartners] = useState<P[]>([]);
  const [cap, setCap] = useState<Cap>({ cashOnHand: 0, toTransfer: 0, commission: 0 });
  const [capPartners, setCapPartners] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // return modal
  const [open, setOpen] = useState(false);
  const [mPartner, setMPartner] = useState("");
  const [mAmount, setMAmount] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [mErr, setMErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/branch/me/capital-returns", { headers: authHeaders() }),
        fetch("/api/branch/me/capital", { headers: authHeaders() }),
      ]);
      const d1 = await r1.json().catch(() => null);
      if (!r1.ok) throw new Error(d1?.error || `Failed to load (${r1.status})`);
      setRows(d1.returns ?? []);
      setPartners(d1.partners ?? []);

      const d2 = await r2.json().catch(() => null);
      if (r2.ok && d2) {
        const c = d2.capital ?? {};
        setCap({
          cashOnHand: num(d2.cashPosition?.cashOnHand ?? d2.cashPosition ?? d2.cashOnHand ?? d2.cash),
          toTransfer: num(c.toTransfer ?? c.capitalToTransfer ?? c.outstanding ?? d2.outstanding),
          commission: num(c.commissionRetained ?? c.commission ?? d2.commission),
        });
        setCapPartners(d2.partners ?? []);
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [from, to, partnerId, q]);

  const maxReturn = Math.max(0, Math.min(cap.cashOnHand, cap.toTransfer));
  const modalPartners = capPartners.length ? capPartners : partners;

  function openModal() {
    setMPartner(modalPartners.length === 1 ? modalPartners[0].id : "");
    setMAmount("");
    setMNotes("");
    setMErr(null);
    setOpen(true);
  }

  async function submitReturn() {
    const amt = Number(mAmount);
    if (!mPartner) return setMErr("Select a partner.");
    if (!Number.isFinite(amt) || amt <= 0) return setMErr("Enter a valid amount.");
    if (amt > maxReturn + 0.005) return setMErr(`You can return at most ${money(maxReturn)}.`);
    setSaving(true);
    setMErr(null);
    try {
      const res = await fetch("/api/branch/me/capital-return", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: mPartner, amount: amt, notes: mNotes || undefined }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || `Failed (${res.status})`);
      setOpen(false);
      await load();
    } catch (e) {
      setMErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const fromD = from ? new Date(`${from}T00:00:00`) : null;
    const toD = to ? new Date(`${to}T23:59:59.999`) : null;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const d = new Date(r.recordedAt);
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      if (partnerId && r.partnerId !== partnerId) return false;
      if (needle && !r.recordedByName.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, from, to, partnerId, q]);

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filterSummary = () => {
    const parts: string[] = [];
    if (from) parts.push(`From ${from}`);
    if (to) parts.push(`To ${to}`);
    if (partnerId) parts.push(`Partner: ${partners.find((p) => p.id === partnerId)?.name ?? ""}`);
    if (q.trim()) parts.push(`Recorded by: ${q.trim()}`);
    return parts.length ? parts.join(" | ") : "All records";
  };

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const aoa: (string | number)[][] = [
      ["TIMS B"],
      ["Capital Returns Report"],
      [filterSummary()],
      [],
      ["Date", "Partner", "Amount", "Recorded By"],
      ...filtered.map((r) => [fmt(r.recordedAt), r.partnerName, r.amount, r.recordedByName]),
      [],
      ["", "Total", total, ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Capital Returns");
    XLSX.writeFile(wb, `capital-returns-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 40;
    let y = 50;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("TIMS B", M, y);
    y += 20;
    doc.setFontSize(12);
    doc.text("Capital Returns Report", M, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(filterSummary(), M, y);
    doc.text(`Generated ${new Date().toLocaleString("en-GB")}`, W - M, y, { align: "right" });
    y += 24;

    const head = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setFillColor(235, 238, 245);
      doc.rect(M, y - 12, W - 2 * M, 20, "F");
      doc.text("Date", M + 6, y);
      doc.text("Partner", M + 130, y);
      doc.text("Recorded By", M + 300, y);
      doc.text("Amount", W - M - 6, y, { align: "right" });
      y += 20;
      doc.setFont("helvetica", "normal");
    };
    head();

    for (const r of filtered) {
      if (y > H - 70) {
        doc.addPage();
        y = 50;
        head();
      }
      doc.text(fmt(r.recordedAt), M + 6, y);
      doc.text(r.partnerName.slice(0, 26), M + 130, y);
      doc.text(r.recordedByName.slice(0, 28), M + 300, y);
      doc.text(money(r.amount), W - M - 6, y, { align: "right" });
      y += 18;
    }

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.line(M, y - 12, W - M, y - 12);
    doc.text("Total", M + 6, y);
    doc.text(money(total), W - M - 6, y, { align: "right" });

    doc.save(`capital-returns-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const panel = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700";
  const field =
    "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500 w-full";
  const ghostBtn =
    "px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed";
  const returnBtn =
    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed";

  if (loading) return <div className="p-6 text-slate-500 dark:text-slate-400">Loading...</div>;

  const atHand = cap.toTransfer + cap.commission;
  const pctTransfer = atHand > 0 ? (cap.toTransfer / atHand) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl text-slate-800 dark:text-white">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Capital Returns</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Return capital to your partner and review every return your branch has made.
          </p>
        </div>
        <button onClick={openModal} disabled={maxReturn <= 0} className={returnBtn}>
          <i className="fa-solid fa-arrow-turn-up" />
          Return Capital
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Left: cash on hand */}
        <div className={`${panel} rounded-xl p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <i className="fa-solid fa-vault text-blue-600 dark:text-blue-400" />
              Cash on hand
            </div>
            <div className="text-3xl font-semibold mt-2">{money(cap.cashOnHand)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Physical cash currently held by the branch.
            </p>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span>Capital at hand</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{money(atHand)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-emerald-200 dark:bg-emerald-500/30">
              <div className="h-full bg-blue-600 dark:bg-blue-400" style={{ width: `${pctTransfer}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-2 text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />To return
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />Commission
              </span>
            </div>
          </div>
        </div>

        {/* Right: two cards */}
        <div className="flex flex-col gap-4">
          <div className={`${panel} rounded-xl p-5 flex items-center justify-between gap-4`}>
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-arrow-turn-up text-blue-600 dark:text-blue-400" />
                Cash to return
              </div>
              <div className="text-2xl font-semibold mt-1 text-blue-700 dark:text-blue-300">
                {money(cap.toTransfer)}
              </div>
              {cap.toTransfer > cap.cashOnHand && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Only {money(cap.cashOnHand)} is available in cash right now.
                </p>
              )}
            </div>
            <button onClick={openModal} disabled={maxReturn <= 0} className={returnBtn}>
              Return Capital
            </button>
          </div>

          <div className={`${panel} rounded-xl p-5`}>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <i className="fa-solid fa-coins text-emerald-600 dark:text-emerald-400" />
              Commission earned
            </div>
            <div className="text-2xl font-semibold mt-1 text-emerald-700 dark:text-emerald-300">
              {money(cap.commission)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kept by the branch. Not returned to the partner.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`${panel} rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3`}>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Partner
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className={`${field} mt-1`}>
            <option value="">All partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Recorded by
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" className={`${field} mt-1`} />
        </label>
        <button
          onClick={() => { setFrom(""); setTo(""); setPartnerId(""); setQ(""); }}
          className={ghostBtn}
        >
          Reset
        </button>
        <div className="flex gap-2 ml-auto">
          <button onClick={exportExcel} disabled={filtered.length === 0} className={ghostBtn}>
            <i className="fa-solid fa-file-excel mr-2" />Excel
          </button>
          <button onClick={exportPdf} disabled={filtered.length === 0} className={ghostBtn}>
            <i className="fa-solid fa-file-pdf mr-2" />PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`${panel} rounded-xl overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Recorded By</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No capital returns match these filters.
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                <td className="px-4 py-3 whitespace-nowrap">{fmt(r.recordedAt)}</td>
                <td className="px-4 py-3">{r.partnerName}</td>
                <td className="px-4 py-3">{r.recordedByName}</td>
                <td className="px-4 py-3 text-right font-medium">{money(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                <td className="px-4 py-3" colSpan={3}>Total ({filtered.length} records)</td>
                <td className="px-4 py-3 text-right">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={ghostBtn}>Prev</button>
          <span className="text-slate-500 dark:text-slate-400">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className={ghostBtn}>Next</button>
        </div>
      )}

      {/* Return modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Return capital</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You can return up to <span className="font-medium text-slate-700 dark:text-slate-200">{money(maxReturn)}</span>{" "}
              (the lower of cash on hand and cash to return).
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                Partner
                <select value={mPartner} onChange={(e) => setMPartner(e.target.value)} className={`${field} mt-1`}>
                  <option value="">Select partner</option>
                  {modalPartners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mAmount}
                  onChange={(e) => setMAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${field} mt-1`}
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                Notes (optional)
                <input value={mNotes} onChange={(e) => setMNotes(e.target.value)} className={`${field} mt-1`} />
              </label>
              {mErr && <p className="text-sm text-red-600 dark:text-red-300">{mErr}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={saving} className={ghostBtn}>Cancel</button>
              <button
                onClick={submitReturn}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Confirm return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
