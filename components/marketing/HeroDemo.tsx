"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScrapeResult, ScrapeStreamEvent } from "@/lib/types";
import { isValidUrl } from "@/lib/validation";
import { streamNdjson } from "@/lib/stream-client";
import { socialCount } from "@/lib/stats";

export default function HeroDemo() {
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState("");

  async function run() {
    const trimmed = url.trim();
    setError("");
    if (!trimmed || !isValidUrl(trimmed)) return setError("Enter a valid URL, e.g. https://example.com");
    setRunning(true);
    setResult(null);
    setMsg("Starting crawl…");
    try {
      await streamNdjson<ScrapeStreamEvent>("/api/scrape", { url: trimmed }, (ev) => {
        if (ev.type === "progress") setMsg(ev.msg);
        else if (ev.type === "result") setResult(ev.result);
        else if (ev.type === "error") setError(ev.msg);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-brand-900/5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs font-medium text-muted">Live demo · Web Email Finder</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !running && run()}
          placeholder="Paste any website URL…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {running ? "Finding…" : "Find data"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {running && <p className="mt-3 text-xs text-muted">🔄 {msg}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat n={result.emails.length} l="Emails" />
            <Stat n={result.phones.length} l="Phones" />
            <Stat n={socialCount(result)} l="Social" />
          </div>
          {result.emails.length > 0 && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Sample emails
              </p>
              <ul className="space-y-0.5">
                {result.emails.slice(0, 3).map((e) => (
                  <li key={e} className="font-mono text-xs text-emerald-700">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            href="/tools/website-extractor"
            className="block rounded-lg bg-brand-50 py-2 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            Open full Website Extractor →
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-lg border border-slate-200 py-2">
      <div className="text-lg font-bold text-brand-600">{n}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{l}</div>
    </div>
  );
}
