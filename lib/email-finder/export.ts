// CSV / JSON serialisation for Email Finder results.
// Pure functions — the browser turns them into a download, no server round-trip.

import type { EmailFindResult } from "@/lib/email-finder/types";

function csvCell(value: string | number | boolean): string {
  const s = String(value ?? "");
  // Guard against spreadsheet formula injection on =, +, -, @ leaders.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

// One row per domain — the same shape as the results grid.
const HEADERS = [
  "domain",
  "business_name",
  "email_address",
  "all_emails",
  "phone_no",
  "contact_form",
  "address",
  "social_profiles",
  "web_category",
  "web_technology",
  "emails_found",
  "pages_scanned",
  "exec_seconds",
  "status",
];

export function emailsToCsv(results: EmailFindResult[]): string {
  const rows: string[] = [HEADERS.map(csvCell).join(",")];
  for (const r of results) {
    rows.push(
      [
        r.domain,
        r.businessName,
        r.emails[0]?.email ?? "",
        r.emails.map((e) => e.email).join(" | "),
        r.phone,
        r.contactFormUrl,
        r.address,
        r.social.map((s) => s.url).join(" | "),
        r.category,
        r.technologies.join(", "),
        r.emails.length,
        r.pagesScanned.length,
        r.elapsed,
        r.status === "success" ? "SUCCESS" : "FAILED",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // BOM so Excel opens UTF-8 correctly.
  return "﻿" + rows.join("\r\n");
}

export function emailsToJson(results: EmailFindResult[]): string {
  return JSON.stringify(
    {
      tool: "web-email-finder",
      generated_at: new Date().toISOString(),
      sites: results.map((r) => ({
        url: r.url,
        domain: r.domain,
        status: r.status,
        error: r.error,
        business_name: r.businessName,
        phone: r.phone,
        contact_form: r.contactFormUrl,
        address: r.address,
        social_profiles: r.social,
        web_category: r.category,
        web_technology: r.technologies,
        pages_scanned: r.pagesScanned,
        elapsed_seconds: r.elapsed,
        email_count: r.emails.length,
        emails: r.emails.map((e) => ({
          email: e.email,
          type: e.kind,
          confidence: e.confidence,
          score: e.score,
          same_domain: e.onSiteDomain,
          from_mailto: e.viaMailto,
          found_on: e.sources,
        })),
      })),
    },
    null,
    2,
  );
}

/** Filename stem: the single domain, or a generic name for bulk runs. */
export function exportBaseName(results: EmailFindResult[]): string {
  if (results.length === 1 && results[0].domain) {
    return `emails_${results[0].domain.replace(/[^a-z0-9.-]/gi, "_")}`;
  }
  return `emails_bulk_${results.length}_sites`;
}
