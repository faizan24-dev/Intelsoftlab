// Web Email Finder — a small, targeted crawl of a single domain.
//
// Unlike the Website Extractor (a broad 25-page sweep), this walks the entry
// page plus the handful of pages that actually carry addresses: contact,
// about, team, support, imprint. Bounded page budget, bounded concurrency.

import { fetchPage } from "@/lib/scraper/fetch";
import { getDomain, isSameDomain, joinUrl, normalizeUrl, stripQueryFragment } from "@/lib/scraper/url";
import { extractPageEmails } from "@/lib/email-finder/extract";
import { classifyEmail, scoreEmail } from "@/lib/email-finder/classify";
import type { EmailFindResult, FoundEmail } from "@/lib/email-finder/types";

/** Paths worth trying even when nothing links to them. */
const SEED_PATHS = [
  "/contact",
  "/contact-us",
  "/contactus",
  "/about",
  "/about-us",
  "/team",
  "/us",
  "/help",
  "/support",
  "/imprint",
  "/impressum",
];

/** Path/anchor fragments that mark a link as likely to carry an address. */
const CONTACT_HINTS = [
  "contact", "about", "team", "people", "staff", "us", "help", "support",
  "reach", "connect", "info", "imprint", "impressum", "legal", "privacy",
  "careers", "jobs", "press", "media", "enquir", "inquir", "who-we-are",
  "our-team", "leadership", "management", "founders", "directory",
];

const DEFAULT_MAX_PAGES = 8;
const CONCURRENCY = 4;
const CRAWL_DELAY_MS: [number, number] = [250, 700];

export interface FindEmailsOptions {
  /** Bias link discovery toward pages matching these words. */
  keywords?: string[];
  /** Total pages to fetch, including the entry page. */
  maxPages?: number;
}

/** Does this URL look like a page that lists contact details? */
function isContactish(url: string, keywords: string[]): boolean {
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return false;
  }
  return (
    CONTACT_HINTS.some((hint) => path.includes(hint)) ||
    keywords.some((k) => k && path.includes(k))
  );
}

/** Same-domain links, contact-looking ones first. */
function discoverLinks(html: string, pageUrl: string, domain: string, keywords: string[]): string[] {
  const found = new Set<string>();
  const anchorHints = new Map<string, string>(); // url → anchor text

  // A light-weight pass; cheerio is already loaded inside extractPageEmails,
  // but link discovery needs the raw href list, so parse hrefs directly.
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const href = m[1].trim();
    if (!href || /^(#|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    const abs = joinUrl(pageUrl, href);
    if (!abs || !isSameDomain(abs, domain)) continue;
    const clean = stripQueryFragment(abs);
    if (!clean || /\.(?:pdf|zip|jpe?g|png|gif|svg|webp|mp4|mp3|docx?|xlsx?)$/i.test(clean)) continue;
    found.add(clean);
    if (!anchorHints.has(clean)) {
      anchorHints.set(clean, m[2].replace(/<[^>]*>/g, " ").toLowerCase());
    }
  }

  const all = [...found];
  const score = (url: string) => {
    const anchor = anchorHints.get(url) || "";
    let s = 0;
    if (isContactish(url, keywords)) s += 10;
    if (CONTACT_HINTS.some((hint) => anchor.includes(hint))) s += 6;
    if (keywords.some((k) => k && anchor.includes(k))) s += 4;
    // Shallower pages are likelier to be the real contact page.
    s -= (url.split("/").length - 3) * 0.5;
    return s;
  };
  return all.sort((a, b) => score(b) - score(a));
}

/**
 * Crawl `rawUrl` and return every contactable address found, de-duplicated,
 * classified and scored.
 */
export async function findEmails(
  rawUrl: string,
  options: FindEmailsOptions = {},
): Promise<EmailFindResult> {
  const started = Date.now();
  const url = normalizeUrl(rawUrl);
  const domain = getDomain(url);
  const maxPages = Math.max(1, Math.min(options.maxPages ?? DEFAULT_MAX_PAGES, 15));
  const keywords = (options.keywords ?? [])
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);

  // email → provenance
  const hits = new Map<string, { sources: Set<string>; viaMailto: boolean; onContactPage: boolean }>();
  const pagesScanned: string[] = [];
  const visited = new Set<string>();

  const record = (pageUrl: string, html: string) => {
    pagesScanned.push(pageUrl);
    const onContactPage = isContactish(pageUrl, keywords) || pagesScanned.length === 1;
    for (const { email, viaMailto } of extractPageEmails(html)) {
      const entry = hits.get(email);
      if (entry) {
        entry.sources.add(pageUrl);
        entry.viaMailto ||= viaMailto;
        entry.onContactPage ||= onContactPage;
      } else {
        hits.set(email, { sources: new Set([pageUrl]), viaMailto, onContactPage });
      }
    }
  };

  // ── Entry page ────────────────────────────────────────────────────────────
  visited.add(url);
  const entry = await fetchPage(url, undefined, CRAWL_DELAY_MS);
  if (!entry) {
    return {
      url,
      domain,
      emails: [],
      pagesScanned: [],
      elapsed: elapsedSince(started),
      status: "fail",
      error: `Could not reach ${domain}. The site may be down, blocking automated requests, or the URL may be wrong.`,
    };
  }
  if (!entry.contentType.includes("text/html")) {
    return {
      url,
      domain,
      emails: [],
      pagesScanned: [],
      elapsed: elapsedSince(started),
      status: "fail",
      error: `${domain} did not return an HTML page (content-type: ${entry.contentType || "unknown"}).`,
    };
  }
  record(url, entry.text);

  // ── Queue: discovered links first, then the well-known seed paths ─────────
  const queue: string[] = [];
  const enqueue = (candidate: string) => {
    const clean = stripQueryFragment(candidate);
    if (!clean || visited.has(clean) || queue.includes(clean)) return;
    queue.push(clean);
  };

  for (const link of discoverLinks(entry.text, url, domain, keywords)) enqueue(link);
  const base = url.replace(/\/+$/, "");
  for (const path of SEED_PATHS) enqueue(base + path);

  // ── Crawl the budget, `CONCURRENCY` pages at a time ───────────────────────
  while (pagesScanned.length < maxPages && queue.length > 0) {
    const batch = queue.splice(0, Math.min(CONCURRENCY, maxPages - pagesScanned.length));
    const pages = await Promise.all(
      batch.map(async (pageUrl) => {
        if (visited.has(pageUrl)) return null;
        visited.add(pageUrl);
        const resp = await fetchPage(pageUrl, 1, CRAWL_DELAY_MS);
        if (!resp || !resp.contentType.includes("text/html")) return null;
        return { pageUrl, html: resp.text };
      }),
    );
    for (const page of pages) {
      if (page && pagesScanned.length < maxPages) record(page.pageUrl, page.html);
    }
  }

  // ── Score, classify, sort ─────────────────────────────────────────────────
  const emails: FoundEmail[] = [...hits.entries()].map(([email, hit]) => {
    const { score, confidence, onSiteDomain } = scoreEmail({
      email,
      siteDomain: domain,
      viaMailto: hit.viaMailto,
      onContactPage: hit.onContactPage,
      pageCount: hit.sources.size,
    });
    return {
      email,
      sources: [...hit.sources],
      kind: classifyEmail(email),
      confidence,
      score,
      viaMailto: hit.viaMailto,
      onSiteDomain,
    };
  });

  const kindRank = { personal: 0, role: 1, generic: 2 } as const;
  emails.sort(
    (a, b) =>
      b.score - a.score ||
      kindRank[a.kind] - kindRank[b.kind] ||
      a.email.localeCompare(b.email),
  );

  return {
    url,
    domain,
    emails,
    pagesScanned,
    elapsed: elapsedSince(started),
    status: "success",
  };
}

function elapsedSince(start: number): number {
  return Math.round((Date.now() - start) / 10) / 100;
}
