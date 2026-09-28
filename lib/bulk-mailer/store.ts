// In-memory campaign registry.
//
// A campaign outlives the request that started it, so the record has to sit
// somewhere the next request can reach. A module-level Map does that in a
// single long-running Node process (`next dev`, `next start`, a container, a
// VPS). It does NOT survive a serverless cold start or span instances — for
// that, swap this module for Redis or a table; the interface is the seam.

import type { Transporter } from "nodemailer";
import type {
  CampaignState,
  CampaignStatus,
  CampaignSummary,
  DeliveryRecord,
  Recipient,
  SenderConfig,
  ThrottleConfig,
  CampaignTemplate,
} from "@/lib/bulk-mailer/types";

export interface CampaignRecord {
  id: string;
  state: CampaignState;
  recipients: Recipient[];
  template: CampaignTemplate;
  sender: SenderConfig;
  throttle: ThrottleConfig;
  /** Live SMTP connection; closed when the run ends. */
  transporter: Transporter | null;
  deliveries: DeliveryRecord[];
  cursor: number;
  startedAt: number;
  finishedAt?: number;
  error?: string;
  cancelRequested: boolean;
  dryRun: boolean;
}

const campaigns = new Map<string, CampaignRecord>();

/** Records are dropped an hour after they finish, so memory stays bounded. */
const RETENTION_MS = 60 * 60 * 1000;
const MAX_CAMPAIGNS = 50;

function sweep(): void {
  const now = Date.now();
  for (const [id, record] of campaigns) {
    const done = record.finishedAt ?? 0;
    if (done && now - done > RETENTION_MS) campaigns.delete(id);
  }
  // Hard cap: drop the oldest finished campaigns first.
  if (campaigns.size > MAX_CAMPAIGNS) {
    const finished = [...campaigns.values()]
      .filter((r) => r.finishedAt)
      .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
    for (const record of finished.slice(0, campaigns.size - MAX_CAMPAIGNS)) {
      campaigns.delete(record.id);
    }
  }
}

export function createCampaignId(): string {
  return `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function putCampaign(record: CampaignRecord): void {
  sweep();
  campaigns.set(record.id, record);
}

export function getCampaign(id: string): CampaignRecord | undefined {
  return campaigns.get(id);
}

export function requestCancel(id: string): boolean {
  const record = campaigns.get(id);
  if (!record) return false;
  if (record.state === "completed" || record.state === "cancelled") return false;
  record.cancelRequested = true;
  return true;
}

export function summarize(record: CampaignRecord): CampaignSummary {
  const total = record.recipients.length;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const d of record.deliveries) {
    if (d.state === "sent") sent++;
    else if (d.state === "failed") failed++;
    else if (d.state === "skipped") skipped++;
  }
  const attempted = sent + failed;
  return {
    total,
    sent,
    failed,
    skipped,
    pending: Math.max(0, total - sent - failed - skipped),
    deliveredPct: attempted ? Math.round((sent / attempted) * 100) : 0,
    failedPct: attempted ? Math.round((failed / attempted) * 100) : 0,
  };
}

/** Seconds of throttle still ahead of us, from the configured pacing. */
function estimateEta(record: CampaignRecord, summary: CampaignSummary): number {
  if (record.state === "completed" || record.state === "cancelled") return 0;
  const { delaySeconds, batchSize, batchPauseSeconds } = record.throttle;
  const remaining = summary.pending;
  const perMessage = Math.max(delaySeconds, 0) + 1; // +1s rough send cost
  const pauses = batchSize > 0 ? Math.floor(remaining / batchSize) : 0;
  return Math.round(remaining * perMessage + pauses * Math.max(batchPauseSeconds, 0));
}

/** The public view of a campaign — never includes SMTP credentials. */
export function toStatus(record: CampaignRecord, logLimit = 200): CampaignStatus {
  const summary = summarize(record);
  return {
    campaignId: record.id,
    state: record.state,
    summary,
    log: record.deliveries.slice(-logLimit).reverse(),
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    error: record.error,
    etaSeconds: estimateEta(record, summary),
  };
}
