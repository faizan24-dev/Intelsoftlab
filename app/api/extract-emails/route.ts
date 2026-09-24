// POST /api/extract-emails
//   { url: string,    keywords?: string[], maxPages?: number }  → single site
//   { urls: string[], keywords?: string[], maxPages?: number }  → bulk
// → { mode, results: EmailFindResult[] }

import { findEmails } from "@/lib/email-finder";
import type { EmailFindResponse, EmailFindResult } from "@/lib/email-finder/types";
import { isValidUrl } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Bulk caps — a request has to finish inside the function's time budget. */
const MAX_BULK_URLS = 10;
const BULK_CONCURRENCY = 3;
const BULK_PAGES_PER_SITE = 5;

interface RequestBody {
  url?: unknown;
  urls?: unknown;
  keywords?: unknown;
  maxPages?: unknown;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const keywords = Array.isArray(body.keywords)
    ? body.keywords.filter((k): k is string => typeof k === "string")
    : [];

  // ── Bulk ──────────────────────────────────────────────────────────────────
  if (Array.isArray(body.urls)) {
    const raw = body.urls.filter((u): u is string => typeof u === "string").map((u) => u.trim());
    const urls = [...new Set(raw.filter(Boolean))];
    if (urls.length === 0) {
      return Response.json({ error: "Provide at least one URL." }, { status: 400 });
    }
    if (urls.length > MAX_BULK_URLS) {
      return Response.json(
        { error: `Bulk mode accepts up to ${MAX_BULK_URLS} URLs per run (got ${urls.length}).` },
        { status: 400 },
      );
    }
    const invalid = urls.filter((u) => !isValidUrl(u));
    if (invalid.length) {
      return Response.json(
        { error: `Invalid URL${invalid.length > 1 ? "s" : ""}: ${invalid.slice(0, 3).join(", ")}` },
        { status: 400 },
      );
    }

    const maxPages = clampPages(body.maxPages, BULK_PAGES_PER_SITE);
    const results = await runPool(urls, BULK_CONCURRENCY, (u) =>
      safeFind(u, { keywords, maxPages }),
    );
    return Response.json({ mode: "bulk", results } satisfies EmailFindResponse);
  }

  // ── Single ────────────────────────────────────────────────────────────────
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return Response.json({ error: "A `url` is required." }, { status: 400 });
  }
  if (!isValidUrl(url)) {
    return Response.json(
      { error: "That doesn't look like a valid URL. Try: https://example.com" },
      { status: 400 },
    );
  }

  const result = await safeFind(url, { keywords, maxPages: clampPages(body.maxPages, 8) });
  return Response.json({ mode: "single", results: [result] } satisfies EmailFindResponse);
}

function clampPages(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? Math.floor(value) : NaN;
  return Number.isFinite(n) ? Math.max(1, Math.min(n, 15)) : fallback;
}

/** One failing site must never fail the whole bulk run. */
async function safeFind(
  url: string,
  options: { keywords: string[]; maxPages: number },
): Promise<EmailFindResult> {
  try {
    return await findEmails(url, options);
  } catch (e) {
    return {
      url,
      domain: url.replace(/^https?:\/\//i, "").split("/")[0],
      emails: [],
      businessName: "",
      phone: "",
      contactFormUrl: "",
      address: "",
      social: [],
      category: "—",
      technologies: [],
      pagesScanned: [],
      elapsed: 0,
      status: "fail",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Run `task` over `items` with at most `limit` in flight, preserving order. */
async function runPool<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      out[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}
