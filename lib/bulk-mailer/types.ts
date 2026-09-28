// Types for the Bulk Mailer.

/** One row of the uploaded list: an address plus its merge-tag columns. */
export interface Recipient {
  email: string;
  /** Column name → value, e.g. { name: "Ada", company: "Analytical" }. */
  fields: Record<string, string>;
}

export type DeliveryState = "pending" | "sending" | "sent" | "failed" | "skipped";

export interface DeliveryRecord {
  email: string;
  state: DeliveryState;
  /** Failure reason, or the server's accept message on success. */
  message?: string;
  /** SMTP response code when the server gave one. */
  code?: string;
  at?: number;
}

export interface SmtpConfig {
  host: string;
  port: number;
  /** true → implicit TLS (465); false → STARTTLS upgrade (587/25). */
  secure: boolean;
  user: string;
  password: string;
}

export interface SenderConfig {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  /** Added as List-Unsubscribe and available as {{unsubscribe_url}}. */
  unsubscribeUrl?: string;
}

export interface ThrottleConfig {
  /** Seconds to wait between individual messages. */
  delaySeconds: number;
  /** Messages per batch before the longer pause. 0 disables batching. */
  batchSize: number;
  /** Seconds to pause between batches. */
  batchPauseSeconds: number;
}

export interface CampaignTemplate {
  subject: string;
  html: string;
}

export type CampaignState = "queued" | "running" | "paused" | "completed" | "cancelled" | "failed";

export interface CampaignSummary {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
  /** Percentage of attempted messages the server accepted. */
  deliveredPct: number;
  failedPct: number;
}

export interface CampaignStatus {
  campaignId: string;
  state: CampaignState;
  summary: CampaignSummary;
  /** Most recent activity first. */
  log: DeliveryRecord[];
  startedAt: number;
  finishedAt?: number;
  /** Set when the campaign itself failed (bad SMTP, etc.). */
  error?: string;
  /** Rough seconds left, from the configured throttle. */
  etaSeconds: number;
}

export interface StartCampaignRequest {
  recipients: Recipient[];
  template: CampaignTemplate;
  sender: SenderConfig;
  smtp: SmtpConfig;
  throttle: ThrottleConfig;
  /** When true, render and validate but never connect or send. */
  dryRun?: boolean;
}
