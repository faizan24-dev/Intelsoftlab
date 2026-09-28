// Shared draft state for the campaign wizard.

import type { Recipient, SenderConfig, SmtpConfig, ThrottleConfig } from "@/lib/bulk-mailer/types";

export interface CampaignDraft {
  recipients: Recipient[];
  columns: string[];
  subject: string;
  html: string;
  sender: SenderConfig;
  smtp: SmtpConfig;
  throttle: ThrottleConfig;
}

export const DEFAULT_DRAFT: CampaignDraft = {
  recipients: [],
  columns: [],
  subject: "Quick question about {{company|your team}}",
  html: `<p>Hi {{name|there}},</p>
<p>I came across {{company|your company}} and thought this might be relevant to you.</p>
<p>Happy to share more if it's useful — just hit reply.</p>
<p>Best,<br>Your name</p>`,
  sender: { fromName: "", fromEmail: "", replyTo: "", unsubscribeUrl: "" },
  smtp: { host: "", port: 587, secure: false, user: "", password: "" },
  throttle: { delaySeconds: 2, batchSize: 50, batchPauseSeconds: 60 },
};

export const STEPS = [
  { n: 1, label: "Recipients" },
  { n: 2, label: "Compose" },
  { n: 3, label: "Sending setup" },
  { n: 4, label: "Send & track" },
] as const;

/** Human-readable duration from a second count. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
