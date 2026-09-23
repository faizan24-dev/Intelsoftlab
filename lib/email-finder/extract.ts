// Per-page email extraction, keeping track of *how* each address was found.
//
// Three passes, because sites publish addresses three different ways:
//   1. `mailto:` links        — the strongest signal, and never obfuscated
//   2. plain text / markup    — the common case
//   3. anti-bot obfuscation   — "name [at] example [dot] com"

import * as cheerio from "cheerio";
import { EMAIL_SOURCE, OBFUSC_SOURCE } from "@/lib/scraper/patterns";
import { visibleText } from "@/lib/scraper/text";
import { normalizeEmail } from "@/lib/email-finder/classify";

export interface PageEmail {
  email: string;
  viaMailto: boolean;
}

/** Decode the entity/escape forms that hide addresses from naive scrapers. */
function decodeCandidate(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&commat;|&#64;/gi, "@")
    .replace(/&period;|&#46;/gi, ".")
    .trim();
}

function normalizeObfuscated(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*[[({<]\s*(?:at|@)\s*[\])}>]\s*/g, "@")
    .replace(/\s+(?:at)\s+/g, "@")
    .replace(/\s*[[({<]\s*(?:dot|punkt|punto)\s*[\])}>]\s*/g, ".")
    .replace(/\s+(?:dot|punkt|punto)\s+/g, ".")
    .replace(/\s+/g, "");
}

/** Every usable address on one page, with mailto provenance. */
export function extractPageEmails(html: string): PageEmail[] {
  const byEmail = new Map<string, boolean>(); // email → viaMailto

  const add = (candidate: string, viaMailto: boolean) => {
    const trimmed = decodeCandidate(candidate).replace(/^[.,;:<>("'\s]+|[.,;:<>)"'\s]+$/g, "");
    const email = normalizeEmail(trimmed);
    if (!email) return;
    // mailto wins: once an address is a real link, keep that provenance.
    byEmail.set(email, (byEmail.get(email) ?? false) || viaMailto);
  };

  const $ = cheerio.load(html);

  // 1. mailto: links (also covers ?subject= query strings)
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!/^mailto:/i.test(href)) return;
    let value = href.slice(7).split("?")[0];
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep the raw value */
    }
    // A single mailto may carry several comma-separated recipients.
    for (const part of value.split(/[,;]/)) add(part, true);
  });

  // 2. Plain addresses anywhere in the markup (covers JSON-LD "email" fields
  //    and data-attributes, which are legitimate publication points).
  const decodedHtml = decodeCandidate(html);
  for (const m of decodedHtml.matchAll(new RegExp(EMAIL_SOURCE, "gi"))) {
    add(m[0], false);
  }

  // 3. Obfuscated forms, over rendered text only — scripts are full of
  //    "@" noise that reads as an address after normalisation.
  const text = visibleText(html);
  for (const m of text.matchAll(new RegExp(OBFUSC_SOURCE, "gi"))) {
    add(normalizeObfuscated(m[0]), false);
  }

  return [...byEmail.entries()].map(([email, viaMailto]) => ({ email, viaMailto }));
}
