// Real Email Verifier — runs the checks in order and scores the result.
//
// Order matters: each step is only worth running if the previous one passed.
// Bad syntax means there is no domain to look up; no MX means there is nothing
// to open an SMTP session against.

import { checkSyntax } from "@/lib/email-verifier/syntax";
import { lookupMx } from "@/lib/email-verifier/mx";
import { inspectProvider } from "@/lib/email-verifier/providers";
import { probeMailbox } from "@/lib/email-verifier/smtp";
import type {
  EmailVerification,
  SmtpOutcome,
  VerificationCheck,
  Verdict,
} from "@/lib/email-verifier/types";

export interface VerifyOptions {
  /** Set false to skip the SMTP handshake (syntax + DNS + lists only). */
  smtp?: boolean;
}

/** "faizan.akhtar@x.com" → "FA"; "support@x.com" → "SU". */
function initialsFor(localPart: string): string {
  const parts = localPart.split(/[._\-+]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const single = parts[0] || localPart;
  return (single.slice(0, 2) || "??").toUpperCase();
}

export async function verifyEmail(
  rawEmail: string,
  options: VerifyOptions = {},
): Promise<EmailVerification> {
  const started = Date.now();
  const email = rawEmail.trim().toLowerCase();
  const syntax = checkSyntax(email);
  const { localPart, domain } = syntax;

  const base = {
    email,
    localPart,
    domain,
    initials: initialsFor(localPart || email),
  };

  // ── A. Syntax ─────────────────────────────────────────────────────────────
  const formatCheck: VerificationCheck = syntax.valid
    ? syntax.suggestion
      ? {
          id: "format",
          label: "Format",
          status: "Possible typo",
          state: "warning",
          detail: `The format is correct, but this domain is one character away from a common one — did you mean ${syntax.suggestion}?`,
        }
      : {
          id: "format",
          label: "Format",
          status: "Valid",
          state: "valid",
          detail: "This email address has the correct format and uses allowed characters.",
        }
    : {
        id: "format",
        label: "Format",
        status: "Invalid",
        state: "invalid",
        detail: syntax.reason || "This email address is not correctly formatted.",
      };

  if (!syntax.valid) {
    return {
      ...base,
      verdict: "invalid",
      score: 0,
      summary: "This email address is not valid",
      checks: [
        formatCheck,
        skipped("type", "Type", "Not checked — the address is malformed."),
        skipped("server", "Server status", "Not checked — the address is malformed."),
        skipped("smtp", "Email status", "Not checked — the address is malformed."),
      ],
      format: { valid: false, reason: syntax.reason, suggestion: syntax.suggestion },
      mx: { found: false, hosts: [] },
      type: { webmail: false, disposable: false, role: false, professional: false },
      smtp: { outcome: "skipped" },
      elapsedMs: Date.now() - started,
    };
  }

  // ── C/D. Provider + role classification (no network needed) ───────────────
  const provider = inspectProvider(localPart, domain);
  const typeCheck: VerificationCheck = provider.disposable
    ? {
        id: "type",
        label: "Type",
        status: "Disposable",
        state: "invalid",
        detail: "This domain belongs to a throwaway inbox service — mail sent here will not be read.",
      }
    : provider.role
      ? {
          id: "type",
          label: "Type",
          status: "Role-based",
          state: "warning",
          detail: "This is a shared department inbox rather than one person's address.",
        }
      : provider.webmail
        ? {
            id: "type",
            label: "Type",
            status: "Webmail",
            state: "warning",
            detail: "This is a free consumer mailbox, not a company-owned address.",
          }
        : {
            id: "type",
            label: "Type",
            status: "Professional",
            state: "valid",
            detail: "This address is on a company-owned domain, not a free webmail provider.",
          };

  // ── B. MX records ─────────────────────────────────────────────────────────
  const mx = await lookupMx(domain);
  const serverCheck: VerificationCheck = mx.found
    ? {
        id: "server",
        label: "Server status",
        status: "Valid",
        state: "valid",
        detail: `MX records are present for ${domain}, so the domain can receive mail.`,
      }
    : {
        id: "server",
        label: "Server status",
        status: "Invalid",
        state: "invalid",
        detail:
          mx.error ||
          `No mail server is configured for ${domain}, so it cannot receive email at all.`,
      };

  if (!mx.found) {
    return {
      ...base,
      verdict: "invalid",
      score: 2,
      summary: "This email address is not valid",
      checks: [
        formatCheck,
        typeCheck,
        serverCheck,
        skipped("smtp", "Email status", "Not checked — the domain has no mail server."),
      ],
      format: { valid: true, suggestion: syntax.suggestion },
      mx,
      type: provider,
      smtp: { outcome: "skipped" },
      elapsedMs: Date.now() - started,
    };
  }

  // ── E. SMTP handshake ─────────────────────────────────────────────────────
  const runSmtp = options.smtp !== false && !provider.disposable;
  const smtp = runSmtp
    ? await probeMailbox(mx.hosts[0], email, domain)
    : ({ outcome: "skipped" as SmtpOutcome, message: "SMTP check was skipped." });

  const smtpCheck = describeSmtp(smtp.outcome, smtp.message);

  // ── Score + verdict ───────────────────────────────────────────────────────
  const { score, verdict } = scoreResult(smtp.outcome, provider, Boolean(syntax.suggestion));

  return {
    ...base,
    verdict,
    score,
    summary: summaryFor(verdict),
    checks: [formatCheck, typeCheck, serverCheck, smtpCheck],
    format: { valid: true, suggestion: syntax.suggestion },
    mx,
    type: provider,
    smtp,
    elapsedMs: Date.now() - started,
  };
}

function skipped(
  id: VerificationCheck["id"],
  label: string,
  detail: string,
): VerificationCheck {
  return { id, label, status: "Not checked", state: "unknown", detail };
}

function describeSmtp(outcome: SmtpOutcome, message?: string): VerificationCheck {
  const map: Record<SmtpOutcome, { status: string; state: VerificationCheck["state"]; detail: string }> = {
    accepted: {
      status: "Valid",
      state: "valid",
      detail: "This email address exists and can receive emails.",
    },
    rejected: {
      status: "Invalid",
      state: "invalid",
      detail: "The mail server says this mailbox does not exist.",
    },
    catch_all: {
      status: "Catch-all",
      state: "warning",
      detail:
        "The domain accepts mail for every address, so the mailbox could not be confirmed individually.",
    },
    greylisted: {
      status: "Greylisted",
      state: "unknown",
      detail: "The mail server asked us to retry later, so the mailbox could not be confirmed.",
    },
    blocked: {
      status: "Unknown",
      state: "unknown",
      detail: message || "The mailbox could not be probed from this server.",
    },
    skipped: {
      status: "Not checked",
      state: "unknown",
      detail: message || "The SMTP check did not run.",
    },
  };
  const entry = map[outcome];
  return { id: "smtp", label: "Email status", ...entry };
}

/**
 * Confidence that mail sent here will arrive.
 * Deliberately conservative: "unknown" never scores like a confirmed mailbox.
 */
function scoreResult(
  outcome: SmtpOutcome,
  provider: { webmail: boolean; disposable: boolean; role: boolean },
  likelyTypo: boolean,
): { score: number; verdict: Verdict } {
  if (provider.disposable) return { score: 12, verdict: "risky" };
  if (outcome === "rejected") return { score: 4, verdict: "invalid" };

  // Syntax and MX have both passed by this point.
  let score = 55;
  let verdict: Verdict = "valid";

  switch (outcome) {
    case "accepted":
      score += 37;
      break;
    case "catch_all":
      score += 5;
      verdict = "risky";
      break;
    case "greylisted":
      score += 8;
      verdict = "unknown";
      break;
    case "blocked":
    case "skipped":
      score += 12;
      verdict = "unknown";
      break;
  }

  if (provider.role) {
    score -= 12;
    if (verdict === "valid") verdict = "risky";
  }
  if (provider.webmail) score -= 2;

  // A domain one edit away from gmail.com is usually a typo — or a
  // typosquatter. Either way it should never read as a confident pass.
  if (likelyTypo && outcome !== "accepted") {
    score = Math.min(score, 40);
    verdict = "risky";
  }

  score = Math.max(5, Math.min(99, score));
  return { score, verdict };
}

function summaryFor(verdict: Verdict): string {
  switch (verdict) {
    case "valid":
      return "This email address is valid";
    case "risky":
      return "This email address is risky";
    case "invalid":
      return "This email address is not valid";
    default:
      return "This email address could not be confirmed";
  }
}
