"use client";

import { useRef, useState } from "react";
import { parseListText, type ParsedList } from "@/lib/bulk-mailer/recipients";
import type { CampaignDraft } from "@/components/tool/bulk-mailer/types";

interface Props {
  draft: CampaignDraft;
  update: (patch: Partial<CampaignDraft>) => void;
}

export default function StepRecipients({ draft, update }: Props) {
  const [pasted, setPasted] = useState("");
  const [stats, setStats] = useState<{ invalid: number; duplicates: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function apply(parsed: ParsedList) {
    update({ recipients: parsed.recipients, columns: parsed.columns });
    setStats({ invalid: parsed.invalid.length, duplicates: parsed.duplicates });
    if (!parsed.recipients.length) {
      setError(
        "No valid email addresses were found. Check that the file has an email column, or paste the addresses instead.",
      );
    } else {
      setError("");
    }
  }

  async function handleFile(file: File) {
    setError("");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch("/api/bulk-mailer/parse", { method: "POST", body: form });
      const data = (await resp.json()) as { parsed?: ParsedList; error?: string };
      if (!resp.ok || !data.parsed) throw new Error(data.error || "Could not read that file.");
      apply(data.parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  function handlePaste() {
    setError("");
    if (!pasted.trim()) return setError("Paste some addresses first.");
    apply(parseListText(pasted));
  }

  const preview = draft.recipients.slice(0, 8);
  const previewColumns = draft.columns.filter(
    (c) => c && !/^e-?mail(\s*address)?$/i.test(c.trim()),
  );

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50/60"
        }`}
      >
        <p className="text-3xl" aria-hidden>
          📄
        </p>
        <p className="mt-2 text-sm font-semibold text-ink">
          Drop a CSV or XLSX file here, or{" "}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-muted">
          The email column is detected automatically. Every other column becomes a merge tag.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,.xlsm,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        {busy && <p className="mt-3 text-xs text-brand-700">Reading file…</p>}
      </div>

      {/* Paste */}
      <div>
        <label htmlFor="paste-list" className="text-sm font-semibold text-ink">
          …or paste addresses
        </label>
        <textarea
          id="paste-list"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={4}
          placeholder={"ada@example.com, grace@example.com\n\nor with columns:\nemail,name,company\nada@example.com,Ada,Analytical Engines"}
          className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={handlePaste}
          className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700"
        >
          Use pasted list
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {/* Preview */}
      {draft.recipients.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              {draft.recipients.length} recipient{draft.recipients.length === 1 ? "" : "s"}
            </span>
            {stats?.duplicates ? (
              <span className="text-xs text-muted">{stats.duplicates} duplicate(s) removed</span>
            ) : null}
            {stats?.invalid ? (
              <span className="text-xs text-amber-700">{stats.invalid} row(s) had no valid address</span>
            ) : null}
            <button
              onClick={() => {
                update({ recipients: [], columns: [] });
                setStats(null);
              }}
              className="ml-auto text-xs font-medium text-muted underline underline-offset-2 hover:text-red-600"
            >
              Clear list
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Email</th>
                  {previewColumns.map((c) => (
                    <th key={c} className="px-3 py-2 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.email} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-ink">{r.email}</td>
                    {previewColumns.map((c) => (
                      <td key={c} className="px-3 py-2 text-muted">
                        {r.fields[c] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {draft.recipients.length > preview.length && (
            <p className="mt-2 text-xs text-muted">
              Showing {preview.length} of {draft.recipients.length}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
