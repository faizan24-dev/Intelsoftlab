// Regexes + crawl constants — ported 1:1 from the Python scraper.py.
// Sources are stored as strings so callers can compile with the flags they need
// (`i` for a single "does it match" test, `gi` for iterating all matches).

import type { SocialPlatform } from "@/lib/types";

// ── Crawl configuration ──────────────────────────────────────────────────────
export const MAX_THREADS = 8; // concurrency pool size
export const MAX_DEPTH = 2;
export const TIMEOUT_MS = 14_000;
export const MAX_RETRIES = 3;
export const MAX_PAGES = 25; // hard cap per domain to be polite
export const MAX_CHILD_LINKS = 12; // children enqueued per page

export const PRIORITY_PATHS = [
  "/contact",
  "/contact-us",
  "/contactus",
  "/about",
  "/about-us",
  "/aboutus",
  "/team",
  "/people",
  "/reach-us",
  "/info",
  "/support",
  "/help",
  "/our-team",
];

// ── Social patterns (sources) ────────────────────────────────────────────────
export const SOCIAL_PATTERN_SOURCES: Record<SocialPlatform, string> = {
  linkedin: String.raw`(?:https?://)?(?:www\.)?linkedin\.com/(?:in|company|school|pub)/[^"'\s<>?#&]+`,
  facebook: String.raw`(?:https?://)?(?:www\.)?facebook\.com/(?!sharer|share|plugins|login|photo|video|events|groups|pg)[^"'\s<>?#&]+`,
  instagram: String.raw`(?:https?://)?(?:www\.)?instagram\.com/(?!p/|reel/|explore/|stories/)[^"'\s<>?#/&]+`,
  twitter: String.raw`(?:https?://)?(?:www\.)?(?:twitter|x)\.com/(?!share|intent|home|search|hashtag|i/)[^"'\s<>?#&]+`,
  tiktok: String.raw`(?:https?://)?(?:www\.)?tiktok\.com/@[^"'\s<>?#&]+`,
  youtube: String.raw`(?:https?://)?(?:www\.)?youtube\.com/(?:channel|c|user|@)[^"'\s<>?#&]+`,
  pinterest: String.raw`(?:https?://)?(?:www\.)?pinterest\.com/[^"'\s<>?#&]+`,
  whatsapp: String.raw`(?:https?://)?(?:api\.)?whatsapp\.com/(?:send|message)[^"'\s<>?#]*`,
};

export const SOCIAL_PLATFORMS = Object.keys(
  SOCIAL_PATTERN_SOURCES,
) as SocialPlatform[];

// ── Email / phone patterns (sources) ─────────────────────────────────────────
export const EMAIL_SOURCE = String.raw`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`;

export const OBFUSC_SOURCE = String.raw`[a-zA-Z0-9._%+\-]+\s*[\[\(]?\s*(?:at|@)\s*[\]\)]?\s*[a-zA-Z0-9.\-]+\s*[\[\(]?\s*(?:dot|\.)\s*[\]\)]?\s*[a-zA-Z]{2,}`;

// Phone numbers are NOT matched with a source pattern from here: a single loose
// regex over raw HTML is what produced JS floats, timestamps and ids as
// "phones". See lib/scraper/phone.ts for the scanner + validator.

// ── Junk email filters ───────────────────────────────────────────────────────
export const JUNK_EMAIL_DOMAINS = new Set([
  "example.com",
  "domain.com",
  "email.com",
  "youremail.com",
  "sentry.io",
  "test.com",
  "sample.com",
]);

export const JUNK_EMAIL_USERS = new Set([
  "noreply",
  "no-reply",
  "mailer-daemon",
  "postmaster",
  "bounce",
  "notifications",
  "donotreply",
]);

export const ASSET_EXTENSIONS = [
  ".png",
  ".jpg",
  ".gif",
  ".svg",
  ".webp",
  ".css",
  ".js",
];

// ── User agents (rotated per request) ────────────────────────────────────────
export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
];
