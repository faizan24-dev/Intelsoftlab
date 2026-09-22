// Main scrape pipeline — ported from scraper.py scrape(), extended with rich extraction.
// BFS crawl over a bounded async worker pool (ThreadPoolExecutor equivalent).

import type {
  CompanyData,
  JobItem,
  KeywordHit,
  ProductItem,
  ProgressCallback,
  ScrapeResult,
  SeoData,
  SocialLinks,
  SocialPlatform,
  TechItem,
} from "@/lib/types";
import {
  MAX_CHILD_LINKS,
  MAX_DEPTH,
  MAX_PAGES,
  MAX_THREADS,
  PRIORITY_PATHS,
  SOCIAL_PLATFORMS,
} from "@/lib/scraper/patterns";
import { checkRobots, fetchPage } from "@/lib/scraper/fetch";
import {
  discoverLinks,
  extractEmails,
  extractMetadata,
  extractSocialLinks,
} from "@/lib/scraper/extract";
import { dedupePhones, extractPhoneCandidates, type ParsedPhone } from "@/lib/scraper/phone";
import { extractAddresses, finalizeAddresses } from "@/lib/scraper/address";
import { detectTech } from "@/lib/scraper/tech";
import {
  extractSeo,
  extractStructured,
  matchKeywords,
  type StructuredResult,
} from "@/lib/scraper/rich";
import { getDomain, normalizeUrl } from "@/lib/scraper/url";

export interface ScrapeOptions {
  maxDepth?: number;
  delayRangeMs?: [number, number];
  keywords?: string[];
}

interface PageData {
  url: string;
  depth: number;
  isEntry: boolean;
  emails: string[];
  phones: ParsedPhone[];
  social: SocialLinks;
  links: string[];
  meta: ReturnType<typeof extractMetadata> | null;
  tech: TechItem[];
  structured: StructuredResult;
  pageAddresses: string[];
  seo: SeoData | null;
  keywordHits: { keyword: string; count: number; sample: string }[];
}

export async function scrape(
  rawUrl: string,
  onProgress?: ProgressCallback,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const start = Date.now();
  const url = normalizeUrl(rawUrl);
  const baseDomain = getDomain(url);
  const maxDepth = options.maxDepth ?? MAX_DEPTH;
  const keywords = (options.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 25);

  const visited = new Set<string>();
  const pagesCrawled: string[] = [];
  const allEmails = new Set<string>();
  const allPhones: ParsedPhone[] = [];
  const allAddresses = new Set<string>();
  const allSocial: Record<SocialPlatform, Set<string>> = Object.fromEntries(
    SOCIAL_PLATFORMS.map((p) => [p, new Set<string>()]),
  ) as Record<SocialPlatform, Set<string>>;
  const techMap = new Map<string, TechItem>();
  const products: ProductItem[] = [];
  const jobs: JobItem[] = [];
  const keywordAgg = new Map<string, { count: number; pages: number; sample: string }>();
  let company: CompanyData | null = null;
  let seo: SeoData | null = null;
  let metadata: PageData["meta"] = null;
  const errors: string[] = [];
  const logs: string[] = [];

  const log = (msg: string) => {
    logs.push(msg);
  };

  const robotsWarning = await checkRobots(url);
  if (robotsWarning) log(`⚠ ${robotsWarning}`);

  // Seed queue: the entry URL plus common contact/about paths.
  const tasks: { url: string; depth: number }[] = [{ url, depth: 0 }];
  for (const path of PRIORITY_PATHS) {
    tasks.push({ url: normalizeUrl(url) + path, depth: 1 });
  }

  let processed = 0;
  let totalEst = Math.max(tasks.length, 10);

  async function processPage(pageUrl: string, depth: number): Promise<PageData | null> {
    if (visited.has(pageUrl) || visited.size >= MAX_PAGES) return null;
    visited.add(pageUrl);

    const resp = await fetchPage(pageUrl, undefined, options.delayRangeMs);
    if (resp === null) {
      errors.push(`Failed: ${pageUrl}`);
      return null;
    }
    if (!resp.contentType.includes("text/html")) return null;

    log(`✓ [${depth}] ${pageUrl}`);
    const html = resp.text;
    const isEntry = pageUrl === url;
    return {
      url: pageUrl,
      depth,
      isEntry,
      emails: extractEmails(html),
      phones: extractPhoneCandidates(html),
      social: extractSocialLinks(html),
      links: depth < maxDepth ? discoverLinks(html, pageUrl, baseDomain) : [],
      meta: metadata ? null : extractMetadata(html, pageUrl),
      tech: detectTech(html, resp.headers),
      structured: extractStructured(html, pageUrl),
      pageAddresses: extractAddresses(html),
      seo: isEntry ? extractSeo(html, pageUrl, baseDomain) : null,
      keywordHits: matchKeywords(html, keywords),
    };
  }

  await new Promise<void>((resolve) => {
    let active = 0;

    const pump = () => {
      if (tasks.length === 0 && active === 0) {
        resolve();
        return;
      }
      while (active < MAX_THREADS && tasks.length > 0) {
        const task = tasks.shift()!;
        if (visited.has(task.url) || visited.size >= MAX_PAGES) continue;
        active++;
        processPage(task.url, task.depth)
          .then((result) => {
            processed++;
            const pct = Math.min(Math.floor((processed / Math.max(totalEst, 1)) * 90), 90);
            onProgress?.(pct, `Scanned ${processed} page(s) on ${baseDomain}…`);
            if (!result) return;

            pagesCrawled.push(result.url);
            result.emails.forEach((e) => allEmails.add(e));
            allPhones.push(...result.phones);
            result.pageAddresses.forEach((a) => allAddresses.add(a));
            result.structured.addresses.forEach((a) => allAddresses.add(a));
            for (const platform of SOCIAL_PLATFORMS) {
              result.social[platform].forEach((l) => allSocial[platform].add(l));
            }
            for (const t of result.tech) if (!techMap.has(t.name)) techMap.set(t.name, t);
            for (const p of result.structured.products) if (products.length < 200) products.push(p);
            for (const j of result.structured.jobs) if (jobs.length < 200) jobs.push(j);
            if (!company && result.structured.company) company = result.structured.company;
            if (result.seo && !seo) seo = result.seo;
            if (result.meta && !metadata) metadata = result.meta;

            for (const hit of result.keywordHits) {
              const cur = keywordAgg.get(hit.keyword);
              if (cur) {
                cur.count += hit.count;
                cur.pages += 1;
                if (!cur.sample) cur.sample = hit.sample;
              } else {
                keywordAgg.set(hit.keyword, { count: hit.count, pages: 1, sample: hit.sample });
              }
            }

            if (result.depth < maxDepth && visited.size < MAX_PAGES) {
              for (const child of result.links.slice(0, MAX_CHILD_LINKS)) {
                if (!visited.has(child)) {
                  tasks.push({ url: child, depth: result.depth + 1 });
                  totalEst++;
                }
              }
            }
          })
          .catch(() => {
            processed++;
          })
          .finally(() => {
            active--;
            pump();
          });
      }
    };

    pump();
  });

  const elapsed = Math.round((Date.now() - start) / 10) / 100;
  onProgress?.(100, "Done!");

  const socialLinks = Object.fromEntries(
    SOCIAL_PLATFORMS.map((p) => [p, [...allSocial[p]].sort()]),
  ) as SocialLinks;

  // Company fallback: derive social profiles into it if missing.
  const keywordHits: KeywordHit[] = keywords.map((kw) => {
    const agg = keywordAgg.get(kw);
    return { keyword: kw, count: agg?.count ?? 0, pages: agg?.pages ?? 0, sample: agg?.sample ?? "" };
  });

  return {
    domain: baseDomain,
    url,
    metadata: metadata ?? {},
    emails: [...allEmails].sort(),
    // De-duplicated across every crawled page, not just within one page.
    phones: dedupePhones(allPhones),
    addresses: finalizeAddresses([...allAddresses]),
    social_links: socialLinks,
    company,
    seo,
    tech: [...techMap.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
    products,
    jobs,
    keyword_hits: keywordHits,
    pages_crawled: pagesCrawled,
    errors,
    logs,
    elapsed,
    status: pagesCrawled.length > 0 ? "success" : "fail",
  };
}
