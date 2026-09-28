"use client";

import { useState } from "react";
import { formatDuration, type CampaignDraft } from "@/components/tool/bulk-mailer/types";

interface Props {
  draft: CampaignDraft;
  update: (patch: Partial<CampaignDraft>) => void;
}

/** Host/port defaults for the providers people actually use. */
const PRESETS = [
  { label: "Gmail / Workspace", host: "smtp.gmail.com", port: 587, secure: false },
  { label: "Outlook 365", host: "smtp-mail.outlook.com", port: 587, secure: false },
  { label: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false },
  { label: "Resend", host: "smtp.resend.com", port: 465, secure: true },
  { label: "Brevo", host: "smtp-relay.brevo.com", port: 587, secure: false },
  { label: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false },
];

export default function StepSmtp({ draft, update }: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const setSender = (patch: Partial<CampaignDraft["sender"]>) =>
    update({ sender: { ...draft.sender, ...patch } });
  const setSmtp = (patch: Partial<CampaignDraft["smtp"]>) =>
    update({ smtp: { ...draft.smtp, ...patch } });
  const setThrottle = (patch: Partial<CampaignDraft["throttle"]>) =>
    update({ throttle: { ...draft.throttle, ...patch } });

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch("/api/bulk-mailer/verify-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft.smtp),
      });
      const data = (await resp.json()) as { ok?: boolean; message?: string; error?: string };
      setTestResult({
        ok: Boolean(data.ok),
        message: data.message || data.error || "No response from the server.",
      });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "Test failed." });
    } finally {
      setTesting(false);
    }
  }

  // Estimated wall-clock time from the throttle settings.
  const n = draft.recipients.length;
  const { delaySeconds, batchSize, batchPauseSeconds } = draft.throttle;
  const pauses = batchSize > 0 ? Math.max(0, Math.floor(n / batchSize) - (n % batchSize === 0 ? 1 : 0)) : 0;
  const etaSeconds = n > 0 ? (n - 1) * delaySeconds + pauses * batchPauseSeconds + n : 0;

  return (
    <div className="space-y-6">
      {/* Sender */}
      <section>
        <h3 className="text-sm font-semibold text-ink">Sender</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Sender name">
            <input
              value={draft.sender.fromName}
              onChange={(e) => setSender({ fromName: e.target.value })}
              placeholder="Ada Lovelace"
              className={inputClass}
            />
          </Field>
          <Field label="From email" required>
            <input
              type="email"
              value={draft.sender.fromEmail}
              onChange={(e) => setSender({ fromEmail: e.target.value })}
              placeholder="ada@yourcompany.com"
              className={inputClass}
            />
          </Field>
          <Field label="Reply-to email">
            <input
              type="email"
              value={draft.sender.replyTo || ""}
              onChange={(e) => setSender({ replyTo: e.target.value })}
              placeholder="replies@yourcompany.com"
              className={inputClass}
            />
          </Field>
          <Field
            label="Unsubscribe URL"
            hint="Adds a List-Unsubscribe header and fills {{unsubscribe_url}}."
          >
            <input
              type="url"
              value={draft.sender.unsubscribeUrl || ""}
              onChange={(e) => setSender({ unsubscribeUrl: e.target.value })}
              placeholder="https://yourcompany.com/unsubscribe"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* SMTP */}
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-ink">SMTP server</h3>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setSmtp({ host: p.host, port: p.port, secure: p.secure })}
                className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-ink-soft transition hover:border-brand-400 hover:text-brand-700"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Host" required>
            <input
              value={draft.smtp.host}
              onChange={(e) => setSmtp({ host: e.target.value })}
              placeholder="smtp.yourprovider.com"
              className={inputClass}
            />
          </Field>
          <Field label="Port" required>
            <input
              type="number"
              value={draft.smtp.port}
              onChange={(e) => setSmtp({ port: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Username">
            <input
              value={draft.smtp.user}
              onChange={(e) => setSmtp({ user: e.target.value })}
              placeholder="apikey / your@email.com"
              autoComplete="off"
              className={inputClass}
            />
          </Field>
          <Field label="Password / API key">
            <input
              type="password"
              value={draft.smtp.password}
              onChange={(e) => setSmtp({ password: e.target.value })}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={draft.smtp.secure}
            onChange={(e) => setSmtp({ secure: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Use implicit TLS (port 465). Leave off for STARTTLS on 587 or 25.
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={testConnection}
            disabled={testing || !draft.smtp.host}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
          {testResult && (
            <span
              className={`rounded-lg px-3 py-1.5 text-xs ring-1 ${
                testResult.ok
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-red-50 text-red-700 ring-red-200"
              }`}
            >
              {testResult.ok ? "✓ " : "✕ "}
              {testResult.message}
            </span>
          )}
        </div>

        <p className="mt-3 text-xs text-muted">
          Credentials are sent to this app&apos;s own API to open the SMTP connection and are held
          in memory for the campaign only — they are never written to disk or logged.
        </p>
      </section>

      {/* Throttle */}
      <section>
        <h3 className="text-sm font-semibold text-ink">Rate limiting</h3>
        <p className="mt-1 text-xs text-muted">
          Sending too fast is the quickest way to get a domain flagged. Most providers also enforce
          their own hourly caps.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Field label="Delay between emails (s)">
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={draft.throttle.delaySeconds}
              onChange={(e) => setThrottle({ delaySeconds: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Batch size" hint="0 disables batching.">
            <input
              type="number"
              min={0}
              value={draft.throttle.batchSize}
              onChange={(e) => setThrottle({ batchSize: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Pause between batches (s)">
            <input
              type="number"
              min={0}
              value={draft.throttle.batchPauseSeconds}
              onChange={(e) => setThrottle({ batchPauseSeconds: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
        </div>
        {n > 0 && (
          <p className="mt-3 rounded-lg bg-brand-50 px-4 py-2.5 text-sm text-brand-700 ring-1 ring-brand-100">
            {n} email{n === 1 ? "" : "s"} at these settings will take roughly{" "}
            <strong>{formatDuration(etaSeconds)}</strong>. Keep this tab open for the whole run.
          </p>
        )}
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-soft">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}
