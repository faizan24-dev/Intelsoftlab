// POST /api/scrape/bulk  { urls: string[] }  → NDJSON stream of per-URL events.

import { scrape } from "@/lib/scraper";
import { isValidUrl } from "@/lib/validation";
import { SOCIAL_PLATFORMS } from "@/lib/scraper/patterns";
import type { BulkStreamEvent, ScrapeResult, SocialLinks } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BULK_URLS = 100;

function emptySocial(): SocialLinks {
  return Object.fromEntries(
    SOCIAL_PLATFORMS.map((p) => [p, [] as string[]]),
  ) as unknown as SocialLinks;
}

export async function POST(req: Request) {
  let urls: unknown;
  try {
    ({ urls } = await req.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(urls)) {
    return Response.json({ error: "`urls` must be an array" }, { status: 400 });
  }

  const valid = urls
    .filter((u): u is string => typeof u === "string")
    .map((u) => u.trim())
    .filter((u) => u && isValidUrl(u))
    .slice(0, MAX_BULK_URLS);

  if (valid.length === 0) {
    return Response.json({ error: "No valid URLs" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: BulkStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      const results: ScrapeResult[] = [];
      send({ type: "start", total: valid.length, urls: valid });

      for (let i = 0; i < valid.length; i++) {
        const url = valid[i];
        send({ type: "url_start", url, index: i });
        try {
          const result = await scrape(url);
          results.push(result);
          send({ type: "url_done", url, index: i, result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const failResult: ScrapeResult = {
            domain: url,
            url,
            metadata: {},
            emails: [],
            phones: [],
            addresses: [],
            social_links: emptySocial(),
            company: null,
            seo: null,
            tech: [],
            products: [],
            jobs: [],
            keyword_hits: [],
            pages_crawled: [],
            errors: [msg],
            logs: [],
            elapsed: 0,
            status: "fail",
          };
          results.push(failResult);
          send({ type: "url_error", url, index: i, msg });
        }
      }

      send({ type: "done", results });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
