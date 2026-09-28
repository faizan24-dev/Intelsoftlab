// The sending queue.
//
// One message at a time, paced by the throttle, with every failure recorded
// against its own recipient — a bad address must never end the campaign.

import { createTransport, describeSmtpError } from "@/lib/bulk-mailer/transport";
import { htmlToText, render } from "@/lib/bulk-mailer/template";
import { putCampaign, createCampaignId, type CampaignRecord } from "@/lib/bulk-mailer/store";
import type { DeliveryRecord, StartCampaignRequest } from "@/lib/bulk-mailer/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Build the record, register it, and start the run without awaiting it. */
export function startCampaign(request: StartCampaignRequest): CampaignRecord {
  const record: CampaignRecord = {
    id: createCampaignId(),
    state: "queued",
    recipients: request.recipients,
    template: request.template,
    sender: request.sender,
    throttle: request.throttle,
    transporter: request.dryRun ? null : createTransport(request.smtp),
    deliveries: [],
    cursor: 0,
    startedAt: Date.now(),
    cancelRequested: false,
    dryRun: Boolean(request.dryRun),
  };
  putCampaign(record);

  // Deliberately not awaited: the HTTP response returns the id immediately and
  // the client polls /status. Errors are captured onto the record.
  void runCampaign(record).catch((e) => {
    record.state = "failed";
    record.error = e instanceof Error ? e.message : String(e);
    record.finishedAt = Date.now();
    record.transporter?.close();
    record.transporter = null;
  });

  return record;
}

async function runCampaign(record: CampaignRecord): Promise<void> {
  record.state = "running";

  const { sender, template, throttle } = record;
  const fromHeader = sender.fromName
    ? `"${sender.fromName.replace(/"/g, "'")}" <${sender.fromEmail}>`
    : sender.fromEmail;

  // A connection problem is a campaign problem, not a per-recipient one, so
  // check it once up front rather than failing every address in turn.
  if (record.transporter) {
    try {
      await record.transporter.verify();
    } catch (e) {
      record.state = "failed";
      record.error = describeSmtpError(e);
      record.finishedAt = Date.now();
      record.transporter.close();
      record.transporter = null;
      return;
    }
  }

  let sentSincePause = 0;

  for (let i = 0; i < record.recipients.length; i++) {
    if (record.cancelRequested) {
      // Everything still queued is reported as skipped, not silently dropped.
      for (const remaining of record.recipients.slice(i)) {
        record.deliveries.push({
          email: remaining.email,
          state: "skipped",
          message: "Campaign cancelled before this message was sent.",
          at: Date.now(),
        });
      }
      record.state = "cancelled";
      break;
    }

    const recipient = record.recipients[i];
    record.cursor = i;

    const ctx = { recipient, unsubscribeUrl: sender.unsubscribeUrl };
    const subject = render(template.subject, ctx, false);
    const html = render(template.html, ctx, true);

    record.deliveries.push(await deliver(record, recipient.email, fromHeader, subject, html));

    sentSincePause++;

    const isLast = i === record.recipients.length - 1;
    if (isLast) break;

    if (throttle.batchSize > 0 && sentSincePause >= throttle.batchSize) {
      sentSincePause = 0;
      await pace(record, throttle.batchPauseSeconds);
    } else {
      await pace(record, throttle.delaySeconds);
    }
  }

  if (record.state !== "cancelled") record.state = "completed";
  record.finishedAt = Date.now();
  record.transporter?.close();
  record.transporter = null;
}

/** Sleep in short slices so a cancel is noticed promptly. */
async function pace(record: CampaignRecord, seconds: number): Promise<void> {
  const total = Math.max(0, seconds) * 1000;
  const step = 250;
  for (let waited = 0; waited < total; waited += step) {
    if (record.cancelRequested) return;
    await sleep(Math.min(step, total - waited));
  }
}

async function deliver(
  record: CampaignRecord,
  email: string,
  from: string,
  subject: string,
  html: string,
): Promise<DeliveryRecord> {
  if (record.dryRun || !record.transporter) {
    return {
      email,
      state: "sent",
      message: "Dry run — message rendered but not sent.",
      at: Date.now(),
    };
  }

  const headers: Record<string, string> = {};
  if (record.sender.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${record.sender.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const info = await record.transporter.sendMail({
      from,
      to: email,
      replyTo: record.sender.replyTo || undefined,
      subject,
      html,
      text: htmlToText(html),
      headers,
    });
    return {
      email,
      state: "sent",
      message: info.response || "Accepted by the server.",
      at: Date.now(),
    };
  } catch (e) {
    const err = e as { responseCode?: number; code?: string };
    return {
      email,
      state: "failed",
      message: describeSmtpError(e),
      code: err?.responseCode ? String(err.responseCode) : err?.code,
      at: Date.now(),
    };
  }
}
