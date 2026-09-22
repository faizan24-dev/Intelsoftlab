"use client";

import { useState } from "react";
import type { ScrapeResult, ScrapeStreamEvent } from "@/lib/types";
import { isValidUrl } from "@/lib/validation";
import { streamNdjson } from "@/lib/stream-client";
import ResultView from "@/components/tool/ResultView";

export default function SingleMode() {
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [running, setRunning] = useState(false);
  const [pct, setPct] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);

  async function run() {
    const trimmed = url.trim();
    setError("");
    if (!trimmed) return setError("Please enter a URL.");
    if (!isValidUrl(trimmed)) return setError("Invalid URL. Try: https://example.com");

    setRunning(true);
    setResult(null);
    setPct(0);
    setStatusMsg("Initialising…");
    const kw = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    try {
      await streamNdjson<ScrapeStreamEvent>("/api/scrape", { url: trimmed, keywords: kw }, (ev) => {
        if (ev.type === "progress") {
          setPct(ev.pct);
          setStatusMsg(ev.msg);
        } else if (ev.type === "result") {
          setResult(ev.result);
        } else if (ev.type === "error") {
          setError(ev.msg);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !running && run()}
          placeholder="https://example.com"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 sm:w-40"
        >
          {running ? "Extracting…" : "⚡ Extract"}
        </button>
      </div>

      <input
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="Optional keywords to search for (comma-separated) — e.g. pricing, careers, api"
        className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {running && (
        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">🔄 {statusMsg}</p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <ResultView result={result} />
        </div>
      )}
    </div>
  );
}
