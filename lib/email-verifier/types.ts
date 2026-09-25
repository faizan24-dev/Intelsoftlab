// Types for the Real Email Verifier.

export type CheckState = "valid" | "invalid" | "warning" | "unknown";

/** One row of the 2×2 breakdown grid. */
export interface VerificationCheck {
  /** Machine key: format | type | server | smtp */
  id: "format" | "type" | "server" | "smtp";
  label: string;
  /** Short verdict shown in bold, e.g. "Valid", "Webmail", "Catch-all". */
  status: string;
  state: CheckState;
  /** One sentence explaining what the status means. */
  detail: string;
}

export type Verdict = "valid" | "risky" | "invalid" | "unknown";

/** Why the SMTP step ended the way it did. */
export type SmtpOutcome =
  | "accepted"
  | "rejected"
  | "catch_all"
  | "greylisted"
  | "blocked"
  | "skipped";

export interface EmailVerification {
  email: string;
  localPart: string;
  domain: string;
  /** Two-letter avatar seed, e.g. "FA" for faizan.akhtar@. */
  initials: string;

  verdict: Verdict;
  /** 0–100 confidence that this address can receive mail. */
  score: number;
  /** Headline sentence: "This email address is valid". */
  summary: string;

  checks: VerificationCheck[];

  // ── Raw signals, for the API consumer ─────────────────────────────────────
  format: { valid: boolean; reason?: string; suggestion?: string };
  mx: { found: boolean; hosts: string[] };
  type: {
    webmail: boolean;
    disposable: boolean;
    role: boolean;
    professional: boolean;
  };
  smtp: { outcome: SmtpOutcome; code?: number; message?: string };

  /** Milliseconds the whole verification took. */
  elapsedMs: number;
}
