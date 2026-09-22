// Counting helpers — ported from utils.py social_count()/summary().

import type { ScrapeResult } from "@/lib/types";

export function socialCount(result: ScrapeResult): number {
  return Object.values(result.social_links).reduce((sum, arr) => sum + arr.length, 0);
}

export interface ResultSummary {
  Domain: string;
  Title: string;
  Description: string;
  "Emails found": number;
  "Phones found": number;
  "Social links": number;
  "Pages crawled": number;
  Errors: number;
  "Time (s)": number;
  Status: string;
}

export function summary(result: ScrapeResult): ResultSummary {
  return {
    Domain: result.domain || "—",
    Title: result.metadata?.title || "—",
    Description: result.metadata?.description || "—",
    "Emails found": result.emails.length,
    "Phones found": result.phones.length,
    "Social links": socialCount(result),
    "Pages crawled": result.pages_crawled.length,
    Errors: result.errors.length,
    "Time (s)": result.elapsed,
    Status: result.status || "—",
  };
}
