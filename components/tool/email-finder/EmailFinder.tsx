"use client";

import { useState } from "react";
import type { EmailFindResponse, EmailFindResult } from "@/lib/email-finder/types";
import { isValidUrl } from "@/lib/validation";
import EmailResults from "@/components/tool/email-finder/EmailResults";

type Mode = "single" | "bulk";

const MAX_BULK_URLS = 10;

export default function EmailFinder() {
  const [mode, setMode] = useState<Mode>("single");
  const [url, setUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [keywords, setKeywords] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<EmailFindResult[] | null>(null);

  const bulkList = bulkUrls
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);

  async function run() {
    setError("");

    let payload: Record<string, unknown>;
    if (mode === "single") {
      const target = url.trim();
      if (!target) return setError("Enter a website URL to search.");
      if (!isValidUrl(target)) return setError("That doesn't look like a valid URL. Try: https://example.com");
      payload = { url: target };
    } else {
      if (bulkList.length === 0) return setError("Add at least one URL — one per line.");
      if (bulkList.length > MAX_BULK_URLS) {
        return setError(`Bulk mode takes up to ${MAX_BULK_URLS} URLs per run (you added ${bulkList.length}).`);
      }
      const bad = bulkList.filter((u) => !isValidUrl(u));
      if (bad.length) return setError(`Invalid URL${bad.length > 1 ? "s" : ""}: ${bad.slice(0, 3).join(", ")}`);
      payload = { urls: bulkList };
    }

    const kw = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (kw.length) payload.keywords = kw;

    setRunning(true);
    setResults(null);
    try {
      const resp = await fetch("/api/extract-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await resp.json()) as EmailFindResponse & { error?: string };
      if (!resp.ok) throw new Error(data?.error || `Request failed (${resp.status})`);
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  const hasResults = results !== null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {/* Mode tabs */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setMode("single")}
          className={`rounded-lg py-2.5 text-sm font-semibold transition ${
            mode === "single" ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink-soft"
          }`}
        >
          🔍 Single URL
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={`rounded-lg py-2.5 text-sm font-semibold transition ${
            mode === "bulk" ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink-soft"
          }`}
        >
          📋 Bulk URLs
        </button>
      </div>

      {/* Input */}
      {mode === "single" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !running && run()}
            placeholder="https://example.com"
            aria-label="Website URL"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <FindButton running={running} onClick={run} />
        </div>
      ) : (
        <div>
          <textarea
            value={bulkUrls}
            onChange={(e) => setBulkUrls(e.target.value)}
            rows={6}
            placeholder={"https://example.com\nhttps://another-site.com\nhttps://third-site.org"}
            aria-label="Website URLs, one per line"
            className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-muted">
              {bulkList.length} URL{bulkList.length === 1 ? "" : "s"} · one per line · max {MAX_BULK_URLS} per run
            </p>
            <div className="sm:ml-auto">
              <FindButton running={running} onClick={run} />
            </div>
          </div>
        </div>
      )}

      {/* Keyword filter */}
      <input
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="Optional page keywords (comma-separated) — e.g. pricing, contact, team"
        aria-label="Page keyword filters"
        className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <p className="mt-2 text-xs text-muted">
        Keywords steer which pages get crawled — the finder always checks the homepage plus contact,
        about, team, support and imprint pages.
      </p>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
        >
          {error}
        </p>
      )}

      {/* Loading */}
      {running && (
        <div className="mt-6 flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
          <Spinner className="h-4 w-4 text-brand-600" />
          <p className="text-sm text-brand-700">
            {mode === "single"
              ? "Scanning the homepage and contact pages…"
              : `Scanning ${bulkList.length} site${bulkList.length === 1 ? "" : "s"}… this can take a minute.`}
          </p>
        </div>
      )}

      {/* Results — EmailResults renders the per-site "nothing found" state itself */}
      {hasResults && !running && <EmailResults results={results} />}

      {!hasResults && !running && !error && (
        <p className="mt-8 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-muted">
          Enter a website URL above and we&apos;ll pull every contact email published on it —
          homepage, contact page, about, team and support pages included.
        </p>
      )}
    </div>
  );
}

function FindButton({ running, onClick }: { running: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={running}
      className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 sm:w-44"
    >
      {running ? (
        <>
          <Spinner className="h-4 w-4 text-white" />
          Finding…
        </>
      ) : (
        <>📧 Find Emails</>
      )}
    </button>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
      />
    </svg>
  );
}
