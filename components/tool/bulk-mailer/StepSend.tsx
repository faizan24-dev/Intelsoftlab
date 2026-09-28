"use client";

import { useEffect, useRef, useState } from "react";
import type { CampaignStatus, DeliveryState } from "@/lib/bulk-mailer/types";
import { formatDuration, type CampaignDraft } from "@/components/tool/bulk-mailer/types";

interface Props {
  draft: CampaignDraft;
}

const STATE_STYLE: Record<DeliveryState, string> = {
  sent: "bg-emerald-500",
  failed: "bg-red-500",
  skipped: "bg-slate-400",
  sending: "bg-brand-500",
  pending: "bg-slate-300",
};

const POLL_MS = 1000;

export default function StepSend({ draft }: Props) {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A plain declaration, not useCallback: it schedules itself, and a callback
  // cannot reference itself before it is declared.
  async function poll(id: string) {
    try {
      const resp = await fetch(`/api/bulk-mailer/status/${id}`, { cache: "no-store" });
      const data = (await resp.json()) as { status?: CampaignStatus; error?: string };
      if (!resp.ok || !data.status) throw new Error(data.error || "Lost track of this campaign.");
      setStatus(data.status);
      const done = ["completed", "cancelled", "failed"].includes(data.status.state);
      if (!done) timer.current = setTimeout(() => void poll(id), POLL_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read campaign progress.");
    }
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function launch() {
    setError("");
    setWarnings([]);
    setStatus(null);
    setStarting(true);
    try {
      const resp = await fetch("/api/bulk-mailer/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: draft.recipients,
          template: { subject: draft.subject, html: draft.html },
          sender: draft.sender,
          smtp: draft.smtp,
          throttle: draft.throttle,
          dryRun,
        }),
      });
      const data = (await resp.json()) as {
        campaignId?: string;
        status?: CampaignStatus;
        warnings?: string[];
        error?: string;
      };
      if (!resp.ok || !data.campaignId) throw new Error(data.error || `Request failed (${resp.status})`);
      setCampaignId(data.campaignId);
      setWarnings(data.warnings ?? []);
      if (data.status) setStatus(data.status);
      void poll(data.campaignId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the campaign.");
    } finally {
      setStarting(false);
    }
  }

  async function cancel() {
    if (!campaignId) return;
    try {
      await fetch(`/api/bulk-mailer/status/${campaignId}`, { method: "DELETE" });
    } catch {
      /* the poll will surface whatever happened */
    }
  }

  const summary = status?.summary;
  const progress = summary && summary.total > 0
    ? Math.round(((summary.sent + summary.failed + summary.skipped) / summary.total) * 100)
    : 0;
  const running = status?.state === "running" || status?.state === "queued";
  const blockers = describeBlockers(draft, dryRun);

  return (
    <div className="space-y-6">
      {/* Launch */}
      {!campaignId && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <h3 className="text-sm font-semibold text-ink">Ready to send</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Recipients" value={`${draft.recipients.length}`} />
            <Row label="Subject" value={draft.subject || "—"} />
            <Row label="From" value={draft.sender.fromEmail || "—"} />
            <Row
              label="Pacing"
              value={`${draft.throttle.delaySeconds}s apart${
                draft.throttle.batchSize > 0
                  ? `, ${draft.throttle.batchPauseSeconds}s every ${draft.throttle.batchSize}`
                  : ""
              }`}
            />
          </dl>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Dry run — render every message and step through the queue without connecting or sending.
          </label>

          {blockers.length > 0 && (
            <ul className="mt-4 space-y-1.5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
              {blockers.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
          )}

          <button
            onClick={launch}
            disabled={starting || blockers.length > 0}
            className="mt-4 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {starting ? "Starting…" : dryRun ? "Start dry run" : `Send to ${draft.recipients.length} recipients`}
          </button>

          {!dryRun && (
            <p className="mt-3 text-xs text-muted">
              Only send to people who agreed to hear from you. Most jurisdictions (GDPR, CAN-SPAM,
              PECR) require a lawful basis and a working unsubscribe path.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {warnings.map((w) => (
        <p key={w} className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {w}
        </p>
      ))}

      {/* Progress */}
      {status && summary && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  status.state === "completed"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : status.state === "failed"
                      ? "bg-red-50 text-red-700 ring-red-200"
                      : status.state === "cancelled"
                        ? "bg-slate-100 text-ink-soft ring-slate-200"
                        : "bg-brand-50 text-brand-700 ring-brand-100"
                }`}
              >
                {status.state.toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-ink tabular-nums">
                Sent: {summary.sent} / {summary.total}
              </span>
              {running && status.etaSeconds > 0 && (
                <span className="text-xs text-muted">~{formatDuration(status.etaSeconds)} left</span>
              )}
              {running && (
                <button
                  onClick={cancel}
                  className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Stop campaign
                </button>
              )}
            </div>

            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {status.error && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {status.error}
              </p>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={summary.sent} label="Total sent" tone="text-emerald-600" />
            <Stat value={`${summary.deliveredPct}%`} label="Accepted" tone="text-brand-600" />
            <Stat value={`${summary.failedPct}%`} label="Failed" tone="text-red-600" />
            <Stat value={summary.pending} label="Pending" tone="text-ink-soft" />
          </div>

          {/* Activity log */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Activity log
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {status.log.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">Waiting for the first send…</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {status.log.map((entry, i) => (
                    <li key={`${entry.email}-${i}`} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATE_STYLE[entry.state]}`}
                        aria-hidden
                      />
                      <span className="w-56 shrink-0 truncate font-medium text-ink">{entry.email}</span>
                      <span
                        className={`w-16 shrink-0 text-xs font-semibold uppercase ${
                          entry.state === "sent"
                            ? "text-emerald-700"
                            : entry.state === "failed"
                              ? "text-red-700"
                              : "text-muted"
                        }`}
                      >
                        {entry.state}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted" title={entry.message}>
                        {entry.code ? `[${entry.code}] ` : ""}
                        {entry.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Failed list, so the addresses can be exported or retried */}
          {summary.failed > 0 && !running && (
            <details className="rounded-xl border border-red-200 bg-red-50/60 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-red-700">
                {summary.failed} failed address{summary.failed === 1 ? "" : "es"}
              </summary>
              <ul className="mt-3 space-y-1 font-mono text-xs text-red-800">
                {status.log
                  .filter((d) => d.state === "failed")
                  .map((d, i) => (
                    <li key={`${d.email}-${i}`}>
                      {d.email} — {d.message}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/** Everything that must be true before the Send button is usable. */
function describeBlockers(draft: CampaignDraft, dryRun: boolean): string[] {
  const out: string[] = [];
  if (!draft.recipients.length) out.push("Add recipients in step 1.");
  if (!draft.subject.trim()) out.push("Write a subject line in step 2.");
  if (!draft.html.trim()) out.push("Write an email body in step 2.");
  if (!draft.sender.fromEmail.trim()) out.push("Set the “From” email in step 3.");
  if (!dryRun && !draft.smtp.host.trim()) out.push("Set the SMTP host in step 3.");
  return out;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="truncate font-medium text-ink">{value}</dd>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string | number; label: string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
