// CSV / JSON serialisation for Email Finder results.
// Pure functions — the browser turns them into a download, no server round-trip.

import type { EmailFindResult } from "@/lib/email-finder/types";

function csvCell(value: string | number | boolean): string {
  const s = String(value ?? "");
  // Guard against spreadsheet formula injection on =, +, -, @ leaders.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

const HEADERS = [
  "email",
  "type",
  "confidence",
  "score",
  "same_domain",
  "from_mailto",
  "found_on",
  "source_domain",
];

export function emailsToCsv(results: EmailFindResult[]): string {
  const rows: string[] = [HEADERS.map(csvCell).join(",")];
  for (const result of results) {
    for (const e of result.emails) {
      rows.push(
        [
          e.email,
          e.kind,
          e.confidence,
          e.score,
          e.onSiteDomain ? "yes" : "no",
          e.viaMailto ? "yes" : "no",
          e.sources.join(" | "),
          result.domain,
        ]
          .map(csvCell)
          .join(","),
      );
    }
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
