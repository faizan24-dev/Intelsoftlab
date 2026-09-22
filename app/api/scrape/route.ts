// POST /api/scrape  { url }  → NDJSON stream of progress + final result.

import { scrape } from "@/lib/scraper";
import { isValidUrl } from "@/lib/validation";
import type { ScrapeStreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let url: string;
  let keywords: string[] = [];
  try {
    const body = await req.json();
    url = body.url;
    if (Array.isArray(body.keywords)) {
      keywords = body.keywords.filter((k: unknown): k is string => typeof k === "string");
    }
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!url || typeof url !== "string" || !isValidUrl(url.trim())) {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ScrapeStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const result = await scrape(
          url.trim(),
          (pct, msg) => send({ type: "progress", pct, msg }),
          { keywords },
        );
        send({ type: "result", result });
      } catch (e) {
        send({ type: "error", msg: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
