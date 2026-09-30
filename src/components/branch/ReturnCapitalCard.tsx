"use client";
import { useEffect, useState } from "react";

type P = { id: string; name: string };

export default function ReturnCapitalCard({ onDone }: { onDone?: () => void }) {
  const [cash, setCash] = useState(0);
  const [partners, setPartners] = useState<P[]>([]);
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  async function load() {
    const res = await fetch("/api/branch/me/capital", { headers: headers() });
    if (!res.ok) return;
    const d = await res.json();
    setCash(Number(d.cashPosition) || 0);
    setPartners(d.partners ?? []);
    if (d.partners.length === 1) setPartnerId(d.partners[0].id);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    setErr("");
    const n = Number(amount);
    if (!partnerId || !(n > 0)) return setErr("Select a partner and enter a valid amount");
    setSaving(true);
    const res = await fetch("/api/branch/me/capital-return", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ partnerId, amount: n }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setErr(d.error || "Failed");
    setOpen(false);
    setAmount("");
    await load();
    onDone?.();
  }

  return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl p-4 flex items-center justify-between">
      <div>
        <div className="text-sm text-slate-500 dark:text-slate-400">Return capital to partner</div>
        <div className="text-lg font-semibold">Cash on hand: ${cash.toFixed(2)}</div>
      </div>
      <button
        onClick={() => setOpen(true)}
        disabled={cash <= 0 || partners.length === 0}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-40"
      >
        Return Capital
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm space-y-3">
            <h3 className="font-semibold">Return capital to partner</h3>
            <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}
              className="w-full border rounded p-2 bg-transparent">
              <option value="">Select partner</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={`Max ${cash.toFixed(2)}`}
              className="w-full border rounded p-2 bg-transparent" />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-2 border rounded">Cancel</button>
              <button onClick={submit} disabled={saving}
                className="px-3 py-2 rounded bg-blue-600 text-white">
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}