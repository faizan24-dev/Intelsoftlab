"use client";

import { useState } from "react";
import type { CheckState, EmailVerification, Verdict } from "@/lib/email-verifier/types";

const VERDICT_STYLE: Record<Verdict, { badge: string; avatar: string; dot: string }> = {
  valid: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    avatar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  risky: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    avatar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  invalid: {
    badge: "bg-red-50 text-red-700 ring-red-200",
    avatar: "bg-red-500",
    dot: "bg-red-500",
  },
  unknown: {
    badge: "bg-slate-100 text-ink-soft ring-slate-200",
    avatar: "bg-slate-400",
    dot: "bg-slate-400",
  },
};

export default function EmailVerifier() {
  const [email, setEmail] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EmailVerification | null>(null);
  const [copied, setCopied] = useState(false);

  async function verify(target?: string) {
    const value = (target ?? email).trim();
    setError("");
    if (!value) return setError("Enter an email address to verify.");

    setRunning(true);
    setResult(null);
    try {
      const resp = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await resp.json()) as { result?: EmailVerification; error?: string };
      if (!resp.ok || !data.result) throw new Error(data.error || `Request failed (${resp.status})`);
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    const text = [
      `Email: ${result.email}`,
      `Result: ${result.summary} (${result.score}% confidence)`,
      ...result.checks.map((c) => `${c.label}: ${c.status} — ${c.detail}`),
    ].join("\n");
    const ok = await copyToClipboard(text);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
    else setError("Your browser blocked clipboard access — select the text to copy it manually.");
  }

  function applySuggestion(suggestion: string) {
    setEmail(suggestion);
    void verify(suggestion);
  }

  const style = result ? VERDICT_STYLE[result.verdict] : VERDICT_STYLE.unknown;

  return (
    <div>
      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !running && verify()}
            placeholder="name@company.com"
            aria-label="Email address to verify"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            onClick={() => verify()}
            disabled={running}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 sm:w-44"
          >
            {running ? (
              <>
                <Spinner className="h-4 w-4 text-white" />
                Verifying…
              </>
            ) : (
              "Verify email"
            )}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        {running && (
          <div className="mt-5 flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
            <Spinner className="h-4 w-4 text-brand-600" />
            <p className="text-sm text-brand-700">
              Checking format, DNS records and the mail server…
            </p>
          </div>
        )}

        {!result && !running && !error && (
          <p className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-muted">
            Enter an address and we&apos;ll check its format, the domain&apos;s mail servers, what
            kind of mailbox it is, and whether the mailbox actually accepts mail.
          </p>
        )}
      </div>

      {/* Result */}
      {result && !running && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Verdict header */}
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-5 sm:p-6">
            <span
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold text-white ${style.avatar}`}
              aria-hidden
            >
              {result.initials}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-ink">{result.email}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
                {result.summary}
                <span className="text-slate-300">·</span>
                <span className="tabular-nums">{result.elapsedMs} ms</span>
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-sm font-bold tabular-nums ring-1 ${style.badge}`}
              title="Confidence that this address can receive mail"
            >
              {result.score}%
            </span>

            <button
              onClick={copyResult}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700"
            >
              {copied ? "✓ Copied" : "Copy result"}
            </button>
          </div>

          {/* Typo suggestion */}
          {result.format.suggestion && (
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800 sm:px-6">
              Did you mean{" "}
              <button
                onClick={() => applySuggestion(result.format.suggestion!)}
                className="font-semibold underline underline-offset-2 hover:text-amber-900"
              >
                {result.format.suggestion}
              </button>
              ?
            </div>
          )}

          {/* 2×2 breakdown */}
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
            {result.checks.map((check) => (
              <div key={check.id} className="bg-white p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {check.label}
                </p>
                <p className="mt-2 flex items-center gap-2 text-base font-semibold text-ink">
                  <StateIcon state={check.state} />
                  {check.status}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{check.detail}</p>
              </div>
            ))}
          </div>

          {/* Technical detail */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-muted sm:px-6">
            <span className="font-medium text-ink-soft">Domain:</span> {result.domain}
            {result.mx.hosts.length > 0 && (
              <>
                <span className="mx-2 text-slate-300">·</span>
                <span className="font-medium text-ink-soft">MX:</span> {result.mx.hosts[0]}
                {result.mx.hosts.length > 1 && ` +${result.mx.hosts.length - 1}`}
              </>
            )}
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-medium text-ink-soft">SMTP:</span> {result.smtp.outcome}
            {result.smtp.code ? ` (${result.smtp.code})` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function StateIcon({ state }: { state: CheckState }) {
  if (state === "valid") {
    return (
      <svg className="h-5 w-5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-label="Pass">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (state === "invalid") {
    return (
      <svg className="h-5 w-5 shrink-0 text-red-600" viewBox="0 0 20 20" fill="currentColor" aria-label="Fail">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.7 7.3a1 1 0 00-1.4 1.4L8.58 10 7.3 11.3a1 1 0 101.4 1.4L10 11.42l1.3 1.28a1 1 0 001.4-1.4L11.42 10l1.28-1.3a1 1 0 10-1.4-1.4L10 8.58z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (state === "warning") {
    return (
      <svg className="h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-label="Warning">
        <path
          fillRule="evenodd"
          d="M8.26 3.1c.77-1.33 2.71-1.33 3.48 0l5.58 9.66c.77 1.33-.19 3-1.74 3H4.42c-1.55 0-2.51-1.67-1.74-3zM10 6a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1zm0 8.5a1.1 1.1 0 100-2.2 1.1 1.1 0 000 2.2z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-label="Unknown">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.2 7.6a1 1 0 011.9-.4c.15.3.05.53-.36.93l-.3.29c-.5.49-.74.94-.74 1.58a1 1 0 102 0c0-.13.05-.24.22-.41l.3-.3c.67-.65 1.1-1.38.68-2.44A3 3 0 006.3 7.1a1 1 0 001.9.5zm1.8 7.4a1.1 1.1 0 100-2.2 1.1 1.1 0 000 2.2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
    </svg>
  );
}

/** Clipboard API first, textarea fallback, then an honest failure. */
async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through */
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
