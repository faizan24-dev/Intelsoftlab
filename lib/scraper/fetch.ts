// HTTP layer — ported from scraper.py fetch()/check_robots().

import { MAX_RETRIES, TIMEOUT_MS, USER_AGENTS } from "@/lib/scraper/patterns";
import { normalizeUrl } from "@/lib/scraper/url";

export interface FetchResult {
  url: string;
  text: string;
  contentType: string;
  headers: Record<string, string>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randBetween = (min: number, max: number) => min + Math.random() * (max - min);

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Fetch a page with retries, UA rotation, and a polite post-request delay.
 * Returns null for 403/404/410 or when all retries are exhausted (mirrors Python).
 */
export async function fetchPage(
  url: string,
  retries = MAX_RETRIES,
  delayRangeMs: [number, number] = [800, 2000],
): Promise<FetchResult | null> {
  const headers = {
    "User-Agent": randomUserAgent(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!resp.ok) {
        const code = resp.status;
        if (code === 403 || code === 404 || code === 410) return null;
        if (code === 429) await sleep(6000);
        // fall through to backoff / retry
      } else {
        const text = await resp.text();
        await sleep(randBetween(delayRangeMs[0], delayRangeMs[1]));
        const headers: Record<string, string> = {};
        resp.headers.forEach((v, k) => {
          headers[k.toLowerCase()] = v;
        });
        return {
          url: resp.url || url,
          text,
          contentType: resp.headers.get("content-type") || "",
          headers,
        };
      }
    } catch {
      // network error / timeout — retry
    }
    if (attempt < retries) {
      await sleep(2 ** attempt * 1000);
    }
  }
  return null;
}

/** Best-effort robots.txt check — returns a warning string if crawling looks restricted. */
export async function checkRobots(baseUrl: string): Promise<string | null> {
  const robotsUrl = normalizeUrl(baseUrl).replace(/\/+$/, "") + "/robots.txt";
  try {
    const resp = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENTS[0] },
      signal: AbortSignal.timeout(8000),
    });
    const text = await resp.text();
    if (text.includes("Disallow: /")) {
      return `robots.txt may restrict crawl on ${baseUrl}`;
    }
  } catch {
    // ignore
  }
  return null;
}
