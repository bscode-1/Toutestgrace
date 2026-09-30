"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-auth";

export type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: { value: string; label: string }[];
};

export function EditRecordModal({
  title, url, fields, initial, onClose, onSaved,
}: {
  title: string;
  url: string;                       // PATCH url
  fields: FieldConfig[];
  initial: Record<string, any>;      // current values keyed by field key
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const body: Record<string, any> = {};
    for (const f of fields) {
      const v = form[f.key];
      if (v === initial[f.key] || v === "" || v === undefined) continue;
      if (f.type === "number") body[f.key] = Number(v);
      else if (f.type === "date") body[f.key] = new Date(v).toISOString();
      else body[f.key] = v;
    }
    try {
      const res = await apiFetch(url, { method: "PATCH", body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <div className="space-y-3">
          {fields.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">{f.label}</span>
              {f.type === "select" ? (
                <select
                  className="w-full rounded-md border px-3 py-2 dark:bg-slate-800"
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  step={f.type === "number" ? "0.01" : undefined}
                  className="w-full rounded-md border px-3 py-2 dark:bg-slate-800"
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoryModal({
  title, url, labels, onClose,
}: {
  title: string;
  url: string;                        // GET history url
  labels: Record<string, string>;     // field key → readable label
  onClose: () => void;
}) {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(url)
      .then((r) => r.json())
      .then((j) => setItems(j.history ?? []))
      .catch(() => setError("Failed to load history"));
  }, [url]);

  const fmt = (k: string, v: any) =>
    k === "recordedAt" && v ? new Date(v).toLocaleString() : String(v ?? "—");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {items === null && !error && <p className="text-sm">Loading...</p>}
        {items?.length === 0 && <p className="text-sm text-slate-500">No edits yet.</p>}
        <div className="space-y-4">
          {items?.map((h) => (
            <div key={h.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-2 text-xs text-slate-500">
                {new Date(h.createdAt).toLocaleString()} · {h.editedBy}
              </div>
              {Object.keys(h.after ?? {}).map((k) => (
                <div key={k}>
                  <span className="font-medium">{labels[k] ?? k}:</span>{" "}
                  <span className="text-red-600 line-through">{fmt(k, h.before?.[k])}</span>{" → "}
                  <span className="text-green-600">{fmt(k, h.after[k])}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}