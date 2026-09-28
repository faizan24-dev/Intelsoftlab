// POST /api/bulk-mailer/send — validate a campaign and start it.
// → { campaignId, status }
//
// Returns as soon as the queue is registered; progress is polled from
// /api/bulk-mailer/status/[campaignId].

import { startCampaign } from "@/lib/bulk-mailer/send";
import { toStatus } from "@/lib/bulk-mailer/store";
import { isEmail } from "@/lib/bulk-mailer/recipients";
import { findUnresolvedTags } from "@/lib/bulk-mailer/template";
import type {
  Recipient,
  SenderConfig,
  SmtpConfig,
  StartCampaignRequest,
  ThrottleConfig,
} from "@/lib/bulk-mailer/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RECIPIENTS = 5000;
const MIN_DELAY_SECONDS = 0.5;

export async function POST(req: Request) {
  let body: Partial<StartCampaignRequest>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ── Recipients ────────────────────────────────────────────────────────────
  const rawRecipients = Array.isArray(body.recipients) ? body.recipients : [];
  const recipients: Recipient[] = [];
  const seen = new Set<string>();
  for (const entry of rawRecipients) {
    const email = typeof entry?.email === "string" ? entry.email.trim().toLowerCase() : "";
    if (!isEmail(email) || seen.has(email)) continue;
    seen.add(email);
    const fields: Record<string, string> = {};
    if (entry.fields && typeof entry.fields === "object") {
      for (const [k, v] of Object.entries(entry.fields)) {
        if (typeof v === "string") fields[k] = v;
      }
    }
    recipients.push({ email, fields });
  }

  if (!recipients.length) {
    return Response.json(
      { error: "No valid recipients. Upload a list or paste some addresses first." },
      { status: 400 },
    );
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return Response.json(
      { error: `This tool sends up to ${MAX_RECIPIENTS} recipients per campaign (got ${recipients.length}).` },
      { status: 400 },
    );
  }

  // ── Template ──────────────────────────────────────────────────────────────
  const subject = typeof body.template?.subject === "string" ? body.template.subject.trim() : "";
  const html = typeof body.template?.html === "string" ? body.template.html : "";
  if (!subject) return Response.json({ error: "A subject line is required." }, { status: 400 });
  if (!html.trim()) return Response.json({ error: "The email body is empty." }, { status: 400 });

  // ── Sender ────────────────────────────────────────────────────────────────
  const fromEmail = typeof body.sender?.fromEmail === "string" ? body.sender.fromEmail.trim() : "";
  if (!isEmail(fromEmail)) {
    return Response.json({ error: "A valid “From” email address is required." }, { status: 400 });
  }
  const replyTo = typeof body.sender?.replyTo === "string" ? body.sender.replyTo.trim() : "";
  if (replyTo && !isEmail(replyTo)) {
    return Response.json({ error: "The reply-to address is not a valid email." }, { status: 400 });
  }
  const sender: SenderConfig = {
    fromName: typeof body.sender?.fromName === "string" ? body.sender.fromName.trim() : "",
    fromEmail,
    replyTo: replyTo || undefined,
    unsubscribeUrl:
      typeof body.sender?.unsubscribeUrl === "string" && body.sender.unsubscribeUrl.trim()
        ? body.sender.unsubscribeUrl.trim()
        : undefined,
  };

  const dryRun = body.dryRun === true;

  // ── SMTP ──────────────────────────────────────────────────────────────────
  const host = typeof body.smtp?.host === "string" ? body.smtp.host.trim() : "";
  const port = Number(body.smtp?.port);
  if (!dryRun) {
    if (!host) return Response.json({ error: "An SMTP host is required." }, { status: 400 });
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      return Response.json({ error: "The SMTP port must be a number between 1 and 65535." }, { status: 400 });
    }
  }
  const smtp: SmtpConfig = {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: body.smtp?.secure === true,
    user: typeof body.smtp?.user === "string" ? body.smtp.user : "",
    password: typeof body.smtp?.password === "string" ? body.smtp.password : "",
  };

  // ── Throttle ──────────────────────────────────────────────────────────────
  const throttle: ThrottleConfig = {
    delaySeconds: clamp(Number(body.throttle?.delaySeconds), MIN_DELAY_SECONDS, 600, 2),
    batchSize: clamp(Number(body.throttle?.batchSize), 0, 1000, 50),
    batchPauseSeconds: clamp(Number(body.throttle?.batchPauseSeconds), 0, 3600, 60),
  };

  // A tag nothing can fill would send "Hi ," — worth warning about, not
  // blocking, because a |fallback may be intended elsewhere.
  const unresolved = findUnresolvedTags([subject, html], recipients);

  const record = startCampaign({
    recipients,
    template: { subject, html },
    sender,
    smtp,
    throttle,
    dryRun,
  });

  return Response.json({
    campaignId: record.id,
    status: toStatus(record),
    warnings: unresolved.length
      ? [`These merge tags have no matching column and will render empty: ${unresolved.map((t) => `{{${t}}}`).join(", ")}`]
      : [],
  });
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}
