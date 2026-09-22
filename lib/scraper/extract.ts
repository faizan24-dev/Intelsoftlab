// Extraction — emails, phones, social links, metadata, link discovery.
// Ported from scraper.py using cheerio in place of BeautifulSoup.

import * as cheerio from "cheerio";
import type { Metadata, SocialLinks, SocialPlatform } from "@/lib/types";
import {
  ASSET_EXTENSIONS,
  EMAIL_SOURCE,
  JUNK_EMAIL_DOMAINS,
  JUNK_EMAIL_USERS,
  OBFUSC_SOURCE,
  PRIORITY_PATHS,
  SOCIAL_PATTERN_SOURCES,
  SOCIAL_PLATFORMS,
} from "@/lib/scraper/patterns";
import { getDomain, isSameDomain, joinUrl, stripQueryFragment } from "@/lib/scraper/url";

const EMAIL_FULLMATCH = new RegExp(`^(?:${EMAIL_SOURCE})$`);

// ── Metadata ─────────────────────────────────────────────────────────────────
export function extractMetadata(html: string, url: string): Metadata {
  const $ = cheerio.load(html);
  const title = ($("title").first().text() || "").trim();

  let description = "";
  $("meta").each((_, el) => {
    if (description) return;
    const name = ($(el).attr("name") || "").toLowerCase();
    const prop = ($(el).attr("property") || "").toLowerCase();
    if (name === "description" || prop === "og:description") {
      description = ($(el).attr("content") || "").trim();
    }
  });

  let ogTitle = "";
  $('meta[property="og:title"]').each((_, el) => {
    ogTitle = ($(el).attr("content") || "").trim();
  });

  return { title: title || ogTitle, description, domain: getDomain(url) };
}

// ── Emails ───────────────────────────────────────────────────────────────────
function validEmail(e: string): boolean {
  if (!EMAIL_FULLMATCH.test(e)) return false;
  const parts = e.split("@");
  return parts.length === 2 && parts[1].includes(".") && parts[1].length > 3;
}

function isJunkEmail(e: string): boolean {
  if (!e.includes(".") || !e.includes("@")) return true;
  const [user, domain] = e.split("@", 2);
  if (ASSET_EXTENSIONS.some((ext) => e.endsWith(ext))) return true;
  return JUNK_EMAIL_DOMAINS.has(domain) || JUNK_EMAIL_USERS.has(user);
}

export function extractEmails(html: string): string[] {
  const emails = new Set<string>();

  // Standard regex
  for (const m of html.matchAll(new RegExp(EMAIL_SOURCE, "gi"))) {
    const e = m[0].toLowerCase().replace(/^[.,;:]+|[.,;:]+$/g, "");
    if (validEmail(e)) emails.add(e);
  }

  // Obfuscated (e.g. "name [at] domain [dot] com")
  for (const m of html.matchAll(new RegExp(OBFUSC_SOURCE, "gi"))) {
    const candidate = m[0]
      .toLowerCase()
      .replaceAll("[at]", "@")
      .replaceAll("(at)", "@")
      .replaceAll(" at ", "@")
      .replaceAll("{at}", "@")
      .replaceAll("[dot]", ".")
      .replaceAll("(dot)", ".")
      .replaceAll(" dot ", ".")
      .replaceAll("{dot}", ".")
      .replace(/\s+/g, "");
    if (validEmail(candidate)) emails.add(candidate);
  }

  // mailto: hrefs
  const $ = cheerio.load(html);
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.toLowerCase().startsWith("mailto:")) {
      const e = href.slice(7).split("?")[0].trim().toLowerCase();
      if (validEmail(e)) emails.add(e);
    }
  });

  return [...emails].filter((e) => !isJunkEmail(e)).sort();
}

// Phone extraction lives in lib/scraper/phone.ts (strict validation + normalization).

// ── Social links ─────────────────────────────────────────────────────────────
function cleanSocialUrl(raw: string): string | null {
  if (!raw) return null;
  let url = raw;
  if (!url.startsWith("http")) url = "https://" + url.replace(/^\/+/, "");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  const clean = `${parsed.protocol}//${parsed.host}${path}`;
  if (path.length < 2) return null;
  return clean.length > 15 ? clean : null;
}

export function extractSocialLinks(html: string): SocialLinks {
  const found: Record<SocialPlatform, Set<string>> = Object.fromEntries(
    SOCIAL_PLATFORMS.map((p) => [p, new Set<string>()]),
  ) as Record<SocialPlatform, Set<string>>;

  const $ = cheerio.load(html);
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    for (const platform of SOCIAL_PLATFORMS) {
      if (new RegExp(SOCIAL_PATTERN_SOURCES[platform], "i").test(href)) {
        const c = cleanSocialUrl(href);
        if (c) found[platform].add(c);
      }
    }
  });

  for (const platform of SOCIAL_PLATFORMS) {
    for (const m of html.matchAll(new RegExp(SOCIAL_PATTERN_SOURCES[platform], "gi"))) {
      const c = cleanSocialUrl(m[0]);
      if (c) found[platform].add(c);
    }
  }

  return Object.fromEntries(
    SOCIAL_PLATFORMS.map((p) => [p, [...found[p]].sort()]),
  ) as SocialLinks;
}

// ── Link discovery ───────────────────────────────────────────────────────────
export function discoverLinks(html: string, baseUrl: string, baseDomain: string): string[] {
  const links = new Set<string>();
  const $ = cheerio.load(html);

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    const full = joinUrl(baseUrl, href);
    if (!full) return;
    let scheme = "";
    try {
      scheme = new URL(full).protocol.replace(":", "");
    } catch {
      return;
    }
    if ((scheme === "http" || scheme === "https") && isSameDomain(full, baseDomain)) {
      const stripped = stripQueryFragment(full);
      if (stripped) links.add(stripped);
    }
  });

  const all = [...links];
  const priority = all.filter((l) => {
    try {
      const path = new URL(l).pathname.toLowerCase();
      return PRIORITY_PATHS.some((p) => path.includes(p));
    } catch {
      return false;
    }
  });
  const prioritySet = new Set(priority);
  const rest = all.filter((l) => !prioritySet.has(l));
  return [...priority, ...rest];
}
