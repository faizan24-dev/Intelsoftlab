// JSON export — ported from utils.py to_json().

import type { ScrapeResult } from "@/lib/types";

export function toJson(result: ScrapeResult, indent = 2): string {
  const exportObj = {
    domain: result.domain || "",
    emails: result.emails,
    phones: result.phones,
    addresses: result.addresses,
    social_links: result.social_links,
    company: result.company,
    seo: result.seo,
    tech: result.tech,
    products: result.products,
    jobs: result.jobs,
    keyword_hits: result.keyword_hits,
    pages_crawled: result.pages_crawled,
    status: result.status || "",
    elapsed_sec: result.elapsed,
    exported_at: new Date().toISOString(),
  };
  return JSON.stringify(exportObj, null, indent);
}

export function toBulkJson(results: ScrapeResult[]): string {
  return JSON.stringify(
    results.map((r) => ({
      domain: r.domain,
      emails: r.emails,
      phones: r.phones,
      social_links: r.social_links,
      status: r.status,
    })),
    null,
    2,
  );
}
