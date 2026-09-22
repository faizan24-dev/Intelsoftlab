"use client";

import { useState } from "react";
import type { BulkStreamEvent, ScrapeResult, SocialPlatform } from "@/lib/types";
import { isValidUrl } from "@/lib/validation";
import { socialCount } from "@/lib/stats";
import { streamNdjson } from "@/lib/stream-client";
import { downloadExport, MetricCard, SectionTitle } from "@/components/tool/shared";

type RowState = "queued" | "scraping" | "done" | "error";
interface Row {
  url: string;
  state: RowState;
  label: string;
}

const BULK_TABS = ["Overview", "All Emails", "All Phones", "Social Links", "Download"] as const;
type BulkTab = (typeof BULK_TABS)[number];

export default function BulkMode() {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [pct, setPct] = useState(0);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<BulkTab>("Overview");

  async function run() {
    setError("");
    setWarning("");
    const lines = input
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const valid = lines.filter((l) => isValidUrl(l));
    const bad = lines.filter((l) => !isValidUrl(l));

    if (bad.length) setWarning(`Skipping ${bad.length} invalid URL(s): ${bad.slice(0, 5).join(", ")}`);
    if (!valid.length) return setError("No valid URLs to process.");

    setRunning(true);
    setResults([]);
    setPct(0);
    setRows(valid.map((url) => ({ url, state: "queued", label: "Queued" })));

    const total = valid.length;
    let completed = 0;

    try {
      await streamNdjson<BulkStreamEvent>("/api/scrape/bulk", { urls: valid }, (ev) => {
        if (ev.type === "url_start") {
          setRows((prev) =>
            prev.map((r, i) => (i === ev.index ? { ...r, state: "scraping", label: "Scraping…" } : r)),
          );
        } else if (ev.type === "url_done") {
          completed++;
          setPct(Math.round((completed / total) * 100));
          const r = ev.result;
          const label =
            r.status === "success"
              ? `✓ ${r.emails.length} emails · ${r.phones.length} phones · ${socialCount(r)} social`
              : "Failed";
          setRows((prev) =>
            prev.map((row, i) =>
              i === ev.index ? { ...row, state: r.status === "success" ? "done" : "error", label } : row,
            ),
          );
        } else if (ev.type === "url_error") {
          completed++;
          setPct(Math.round((completed / total) * 100));
          setRows((prev) =>
            prev.map((row, i) =>
              i === ev.index ? { ...row, state: "error", label: `Error: ${ev.msg.slice(0, 60)}` } : row,
            ),
          );
        } else if (ev.type === "done") {
          setResults(ev.results);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk extraction failed.");
    } finally {
      setRunning(false);
    }
  }

  const dot: Record<RowState, string> = {
    queued: "bg-amber-400 animate-pulse",
    scraping: "bg-amber-400 animate-pulse",
    done: "bg-emerald-500",
    error: "bg-red-500",
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Paste one URL per line (up to 100). Each site is scraped independently and combined into one
        downloadable Excel workbook.
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={7}
        placeholder={"https://example.com\nhttps://another-site.com\nhttps://company.org"}
        className="w-full rounded-lg border border-slate-300 p-4 font-mono text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      <button
        onClick={run}
        disabled={running}
        className="mt-3 w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
      >
        {running ? "Processing…" : "🚀 Start Bulk Extraction"}
      </button>

      {warning && (
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 ring-1 ring-amber-200">
          ⚠️ {warning}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-5">
          {running && (
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.url} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot[r.state]}`} />
                <span className={r.state === "error" ? "text-red-600" : r.state === "done" ? "text-emerald-700" : "text-amber-600"}>
                  {r.label}
                </span>
                <span className="ml-auto truncate font-mono text-xs text-muted">{r.url}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && <BulkResults results={results} tab={tab} setTab={setTab} />}
    </div>
  );
}

function BulkResults({
  results,
  tab,
  setTab,
}: {
  results: ScrapeResult[];
  tab: BulkTab;
  setTab: (t: BulkTab) => void;
}) {
  const totalEmails = results.reduce((s, r) => s + r.emails.length, 0);
  const totalPhones = results.reduce((s, r) => s + r.phones.length, 0);
  const totalSocial = results.reduce((s, r) => s + socialCount(r), 0);
  const totalPages = results.reduce((s, r) => s + r.pages_crawled.length, 0);
  const success = results.filter((r) => r.status === "success").length;
  const totalTime = Math.round(results.reduce((s, r) => s + r.elapsed, 0) * 10) / 10;

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="mb-4 text-lg font-bold text-ink">📊 Bulk Results Summary</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard value={totalEmails} label="Total Emails" />
        <MetricCard value={totalPhones} label="Total Phones" />
        <MetricCard value={totalSocial} label="Social Links" />
        <MetricCard value={totalPages} label="Pages Crawled" />
        <MetricCard value={`${success}/${results.length}`} label="Success Rate" />
        <MetricCard value={`${totalTime}s`} label="Total Time" />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {BULK_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-muted hover:text-ink-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        {tab === "Overview" && <OverviewTable results={results} />}
        {tab === "All Emails" && <FlatTable headers={["Email", "Source Domain", "Email Domain"]} rows={results.flatMap((r) => r.emails.map((e) => [e, r.domain, e.includes("@") ? e.split("@").pop()! : ""]))} empty="No emails found across all sites." />}
        {tab === "All Phones" && <FlatTable headers={["Phone", "Source Domain"]} rows={results.flatMap((r) => r.phones.map((p) => [p, r.domain]))} empty="No phone numbers found." />}
        {tab === "Social Links" && <FlatTable headers={["Platform", "URL", "Source Domain"]} rows={results.flatMap((r) => Object.entries(r.social_links).flatMap(([pl, links]) => links.map((l) => [capitalize(pl), l, r.domain])))} empty="No social links found." />}
        {tab === "Download" && <BulkDownload results={results} counts={{ totalEmails, totalPhones, totalSocial }} />}
      </div>
    </div>
  );
}

function OverviewTable({ results }: { results: ScrapeResult[] }) {
  const platforms: SocialPlatform[] = ["linkedin", "facebook", "instagram", "twitter", "tiktok"];
  return (
    <table className="w-full min-w-[720px] border-collapse text-sm">
      <thead>
        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
          <th className="px-3 py-2">Domain</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2">Emails</th>
          <th className="px-3 py-2">Phones</th>
          {platforms.map((p) => (
            <th key={p} className="px-3 py-2">{capitalize(p)}</th>
          ))}
          <th className="px-3 py-2">Pages</th>
          <th className="px-3 py-2">Time</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.domain + r.url} className="border-b border-slate-100">
            <td className="px-3 py-2 font-medium text-ink">{r.domain}</td>
            <td className={`px-3 py-2 font-semibold ${r.status === "success" ? "text-emerald-600" : "text-red-600"}`}>
              {r.status.toUpperCase()}
            </td>
            <td className="px-3 py-2">{r.emails.length}</td>
            <td className="px-3 py-2">{r.phones.length}</td>
            {platforms.map((p) => (
              <td key={p} className="px-3 py-2">{r.social_links[p].length}</td>
            ))}
            <td className="px-3 py-2">{r.pages_crawled.length}</td>
            <td className="px-3 py-2">{r.elapsed}s</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FlatTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <>
      <SectionTitle>{`${rows.length} total`}</SectionTitle>
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 font-mono text-xs text-ink-soft">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function BulkDownload({
  results,
  counts,
}: {
  results: ScrapeResult[];
  counts: { totalEmails: number; totalPhones: number; totalSocial: number };
}) {
  return (
    <>
      <SectionTitle>Download Bulk Report</SectionTitle>
      <p className="mb-4 text-sm text-muted">
        The Excel workbook contains 5 formatted sheets — Overview, All Emails, All Phones, Social
        Links, and Errors — plus automatic SUM totals on the Overview sheet.
      </p>
      <button
        onClick={() => downloadExport("xlsx", "bulk", { results })}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
      >
        📥 Download Excel Workbook (.xlsx)
      </button>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted">
        Sites: {results.length} · Emails: {counts.totalEmails} · Phones: {counts.totalPhones} · Social:{" "}
        {counts.totalSocial}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => downloadExport("json", "bulk", { results })}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink-soft transition hover:bg-slate-50"
        >
          ⬇️ Download JSON
        </button>
        <button
          onClick={() => downloadExport("csv", "bulk", { results })}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink-soft transition hover:bg-slate-50"
        >
          ⬇️ Download CSV
        </button>
      </div>
    </>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
