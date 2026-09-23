"use client";

import { useMemo, useState } from "react";
import type { Confidence, EmailFindResult, EmailKind } from "@/lib/email-finder/types";
import { emailsToCsv, emailsToJson, exportBaseName } from "@/lib/email-finder/export";

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-100 text-muted ring-slate-200",
};

const KIND_LABEL: Record<EmailKind, string> = {
  personal: "Personal",
  role: "Role",
  generic: "Generic",
};

const KIND_STYLE: Record<EmailKind, string> = {
  personal: "bg-brand-50 text-brand-700 ring-brand-200",
  role: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  generic: "bg-slate-100 text-ink-soft ring-slate-200",
};

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Copy text to the clipboard.
 * `navigator.clipboard` is denied in embedded/permission-restricted contexts,
 * so fall back to a hidden textarea before reporting failure.
 */
async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Shorten a source URL to just its path, so the column stays readable. */
function shortPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return path || "/";
  } catch {
    return url;
  }
}

export default function EmailResults({ results }: { results: EmailFindResult[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const totals = useMemo(() => {
    const all = results.flatMap((r) => r.emails);
    return {
      emails: all.length,
      sites: results.length,
      reached: results.filter((r) => r.status === "success").length,
      personal: all.filter((e) => e.kind === "personal").length,
      highConfidence: all.filter((e) => e.confidence === "high").length,
      pages: results.reduce((n, r) => n + r.pagesScanned.length, 0),
    };
  }, [results]);

  async function copy(value: string) {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(value);
      setCopyFailed(false);
      setTimeout(() => setCopied((c) => (c === value ? null : c)), 1600);
    } else {
      // Never fail silently — the row still lets them select the address.
      setCopied(null);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 4000);
    }
  }

  const base = exportBaseName(results);
  const allEmails = results.flatMap((r) => r.emails.map((e) => e.email));

  return (
    <div className="mt-8">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={totals.emails} label="Emails found" />
        <Stat value={totals.personal} label="Personal" />
        <Stat value={totals.highConfidence} label="High confidence" />
        <Stat value={totals.pages} label="Pages scanned" />
      </div>

      {/* Export bar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => download(emailsToCsv(results), `${base}.csv`, "text/csv;charset=utf-8")}
          disabled={!totals.emails}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
        >
          ⬇ Export CSV
        </button>
        <button
          onClick={() => download(emailsToJson(results), `${base}.json`, "application/json")}
          disabled={!totals.emails}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
        >
          ⬇ Export JSON
        </button>
        <button
          onClick={() => copy(allEmails.join(", "))}
          disabled={!totals.emails}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
        >
          {copied === allEmails.join(", ") ? "✓ Copied all" : "📋 Copy all"}
        </button>
        {results.length > 1 && (
          <span className="ml-auto text-xs text-muted">
            {totals.reached} of {totals.sites} sites reached
          </span>
        )}
      </div>

      {copyFailed && (
        <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          Your browser blocked clipboard access — select the address and copy it manually, or use
          the CSV / JSON export.
        </p>
      )}

      {/* Per-site results */}
      <div className="mt-5 space-y-5">
        {results.map((result) => (
          <section
            key={result.url}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                  result.status === "success"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-red-50 text-red-700 ring-red-200"
                }`}
              >
                {result.status === "success" ? "✅ Scanned" : "❌ Failed"}
              </span>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-semibold text-ink hover:text-brand-700"
              >
                {result.domain || result.url}
              </a>
              <span className="ml-auto text-xs text-muted">
                {result.emails.length} email{result.emails.length === 1 ? "" : "s"} ·{" "}
                {result.pagesScanned.length} page{result.pagesScanned.length === 1 ? "" : "s"} ·{" "}
                {result.elapsed}s
              </span>
            </header>

            {result.error && (
              <p className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {result.error}
              </p>
            )}

            {result.status === "success" && result.emails.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">
                No contact emails found on {result.domain}. The site may hide addresses behind a
                contact form, load them with JavaScript, or serve them as images.
              </p>
            )}

            {result.emails.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-muted">
                      <th className="px-4 py-2.5 font-semibold">Email</th>
                      <th className="px-4 py-2.5 font-semibold">Type</th>
                      <th className="px-4 py-2.5 font-semibold">Confidence</th>
                      <th className="px-4 py-2.5 font-semibold">Found on</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Copy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.emails.map((e) => (
                      <tr key={e.email} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <a
                            href={`mailto:${e.email}`}
                            className="font-medium text-ink hover:text-brand-700"
                          >
                            {e.email}
                          </a>
                          {!e.onSiteDomain && (
                            <span className="ml-2 text-[11px] text-muted">off-domain</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${KIND_STYLE[e.kind]}`}
                          >
                            {KIND_LABEL[e.kind]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            title={`Score ${e.score}/100${e.viaMailto ? " · published as a mailto: link" : ""}`}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ${CONFIDENCE_STYLE[e.confidence]}`}
                          >
                            {e.confidence} · {e.score}
                          </span>
                        </td>
                        <td className="max-w-[18rem] px-4 py-3">
                          <a
                            href={e.sources[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-muted hover:text-brand-700"
                            title={e.sources.join("\n")}
                          >
                            {shortPath(e.sources[0])}
                            {e.sources.length > 1 && ` +${e.sources.length - 1}`}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => copy(e.email)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-brand-400 hover:text-brand-700"
                          >
                            {copied === e.email ? "✓ Copied" : "Copy"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-2xl font-bold text-brand-600">{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
