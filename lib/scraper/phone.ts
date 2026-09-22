// Phone number extraction + validation.
//
// The old version ran a loose regex over the raw HTML, so anything
// number-shaped came back as a "phone": JS floats (0.300000000000000),
// unix timestamps formatted with dots (1.694.625.712), CSS values, ISBNs and
// arbitrary database ids. This module instead:
//   1. reads declared numbers from tel: links, microdata and JSON-LD,
//   2. scans *visible text only* for phone-shaped tokens,
//   3. validates every candidate against real dialling shapes,
//   4. normalizes and de-duplicates the survivors.

import * as cheerio from "cheerio";
import { visibleText } from "@/lib/scraper/text";

export interface ParsedPhone {
  /** Cleaned, display-ready form, e.g. "+92 300 1234567" or "(555) 123-4567". */
  display: string;
  /** Digits only — the de-duplication key. */
  digits: string;
  /** True when the number was declared as a phone by the markup itself. */
  trusted: boolean;
}

// E.164 allows at most 15 digits; 7 is the shortest realistic local number.
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

/**
 * Scanning pattern. Deliberately a little loose — the validator below does the
 * real work — but anchored so a match can never start in the middle of a
 * longer number: a preceding digit, dot, comma, slash, plus or word character
 * disqualifies the position. That means "1.694.625.712" is consumed (and then
 * rejected) as a whole instead of yielding a bogus "694.625.712" sub-match.
 */
const CANDIDATE_RE =
  /(?<![\w.+,/-])((?:\(\d{2,5}\)|\+?\d)[\d()\s.\u00A0\u2010-\u2015-]{5,22}\d)(?:\s*[,;]?\s*(?:ext|extn|ext\.|x|#)\s*[:.]?\s*(\d{1,6}))?(?![\w-])/gi;

const CURRENCY_BEFORE_RE = /[$€£¥₹₨฿₦₽]\s?$/;
// Units / suffixes that mark the token as a measurement, price or ordinal.
const UNIT_AFTER_RE =
  /^\s*(?:%|px|pt|em|rem|vh|vw|ms|kg|lbs?|oz|km|cm|mm|mi|ft|in|mb|gb|tb|kb|hz|khz|mhz|ghz|bps|kbps|mbps|usd|eur|gbp|pkr|inr|aed|st|nd|rd|th|am|pm|°|\/5|\/10|\/100)\b/i;
// A trailing "+" or a counted noun means the number is a quantity: "1 707 000+
// articles", "50 000 customers".
const COUNT_AFTER_RE =
  /^\s*(?:\+|\+?\s*(?:articles|users|customers|clients|downloads|installs|reviews|ratings|members|followers|subscribers|views|visitors|products|items|sales|orders|projects|companies|businesses|websites|people|students|employees))\b/i;
const CONTEXT_WORD_BEFORE_RE =
  /\b(?:version|ver|build|rev|revision|sku|isbn|issn|id|ref|order|invoice|item|qty|quantity|width|height|size|lat|latitude|lng|longitude|utc|gmt|ein|tin|vat|nif|cif|duns|tax|registration|licen[cs]e|account|routing)\b[\s:#.()]*$/i;

/** Strictly ascending or descending digit run, e.g. 1234567890 / 9876543210. */
function isSequential(digits: string): boolean {
  if (digits.length < 7) return false;
  let asc = true;
  let desc = true;
  for (let i = 1; i < digits.length; i++) {
    const step = digits.charCodeAt(i) - digits.charCodeAt(i - 1);
    if (step !== 1) asc = false;
    if (step !== -1) desc = false;
  }
  return asc || desc;
}

// Any embedded ISO date disqualifies the whole token ("2026 2026-09-01").
const ISO_DATE_RE = /(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/;

function looksLikeDate(body: string): boolean {
  if (ISO_DATE_RE.test(body)) return true;
  const groups = body.split(/[\s.-]+/).filter(Boolean);
  // Two or more four-digit years in one token is a date list, not a number.
  if (groups.filter((g) => /^(?:19|20)\d{2}$/.test(g)).length >= 2) return true;
  if (groups.length === 3 && groups.every((g) => /^\d+$/.test(g))) {
    const [a, b, c] = groups;
    const ymd = a.length === 4 && b.length <= 2 && c.length <= 2; // 2024-01-15
    const dmy = a.length <= 2 && b.length <= 2 && (c.length === 4 || c.length === 2); // 15-01-2024
    if (ymd || dmy) return true;
  }
  // Year range, e.g. 2023-2024.
  if (groups.length === 2 && groups.every((g) => /^(?:19|20)\d{2}$/.test(g))) return true;
  return false;
}

/** Dotted notation is the biggest source of false positives — gate it hard. */
function dottedShapeIsOk(body: string, plus: boolean): boolean {
  if (!body.includes(".")) return true;
  const groups = body.split(".");
  // A leading "+" is the author marking this as a phone number, so the dotted
  // international style is fine there: "+1.339.273.2711".
  if (plus) return groups.length <= 4 && groups.every((g) => /^\d{1,4}$/.test(g));
  // IPv4 / version strings / dot-grouped timestamps.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(body)) return false;
  if (groups.length > 3) return false; // 1.694.625.712, 1.2.3.4, …
  // Dots may only separate clean 2-4 digit groups: 555.123.4567, 020.7123.4567.
  // A float such as 0.300000000000000 fails on the oversized second group.
  if (!groups.every((g) => /^\d{2,4}$/.test(g))) return false;
  if (/^0\d?$/.test(groups[0])) return false; // 0.30…, 00.12…
  return true;
}

/**
 * Validate + normalize one candidate.
 * `trusted` relaxes only the length floor and the bare-digit-run rules, for
 * numbers the page itself labelled as a phone (tel:, itemprop, JSON-LD).
 */
export function parsePhone(raw: string, trusted = false): ParsedPhone | null {
  if (!raw) return null;

  let s = raw
    .replace(/[\u00A0\u2007\u202F\u2009]/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .trim();
  if (!s) return null;

  // Split off an extension so it does not inflate the digit count.
  let ext = "";
  const extMatch = s.match(/[,;]?\s*(?:ext|extn|ext\.|x|#)\s*[:.]?\s*(\d{1,6})\s*$/i);
  if (extMatch && extMatch.index !== undefined) {
    ext = extMatch[1];
    s = s.slice(0, extMatch.index).trim();
  }

  // Trim anything that is not part of the number itself, keeping a leading
  // "(" when it opens a parenthesised area code: "(555) 123-4567".
  s = s.replace(/^[^\d+(]+/, "").replace(/[^\d)]+$/, "");
  if (s.startsWith("(") && !s.includes(")")) s = s.slice(1);
  if (!s || !/[\d]/.test(s)) return null;

  const plus = s.startsWith("+");
  const body = plus ? s.slice(1) : s;
  if (!body || /[^\d()\s.-]/.test(body)) return null;
  if (/\(\D*\)/.test(body)) return null; // empty parens
  if ((body.match(/\(/g) || []).length > 1) return null;

  const digits = body.replace(/\D/g, "");
  if (!digits) return null;

  if (!dottedShapeIsOk(body, plus)) return null;
  if (looksLikeDate(body)) return null;

  // Group shape: phones have at most 4 groups (e.g. +1-800-555-1234);
  // 5+ groups means ISBN / part number / id.
  const groups = body.split(/[\s.-]+/).filter(Boolean);
  if (groups.length > 4) return null;
  if (groups.some((g) => g.replace(/\D/g, "").length > 11)) return null;
  // "84-4023862" is an EIN/tax id, not a phone: no dialling plan groups 2 + 6-7.
  if (!plus && groups.length === 2 && /^\d{2}$/.test(groups[0]) && /^\d{6,7}$/.test(groups[1])) {
    return null;
  }

  // Thousands separators: "1 707 000" (Wikipedia article counts) is a quantity,
  // not a number. Real national formats lead with a 3+ digit area code or use
  // groups that are not uniformly three digits ("1-800-555-1234").
  if (
    !plus &&
    !body.includes("(") &&
    groups.length >= 2 &&
    /^\d{1,2}$/.test(groups[0]) &&
    groups.slice(1).every((g) => /^\d{3}$/.test(g))
  ) {
    return null;
  }

  const min = trusted ? MIN_DIGITS : plus ? 8 : MIN_DIGITS;
  if (digits.length < min || digits.length > MAX_DIGITS) return null;

  // Bare digit runs are where arbitrary ids live, so only accept the lengths
  // people actually write phones in: 10 (national) or 11 (trunk / NANP "1").
  const bare = /^\d+$/.test(body);
  if (bare && !trusted) {
    if (plus) {
      if (digits.length < 8) return null;
    } else {
      if (digits.length !== 10 && digits.length !== 11) return null;
      // A 10-digit run starting 0/1 is a unix timestamp or a padded id — area
      // codes never start with 0 or 1.
      if (digits.length === 10 && /^[01]/.test(digits)) return null;
      if (digits.length === 11 && !/^[01]/.test(digits)) return null;
    }
  }

  // Digit-pattern junk filters.
  if (/^(\d)\1+$/.test(digits)) return null; // 0000000, 1111111111
  if (isSequential(digits)) return null; // 1234567890
  if (/(\d)\1{6,}/.test(digits)) return null; // 300000000000000
  if (/^000/.test(digits)) return null;
  if (plus && digits.startsWith("0")) return null; // no country code starts with 0

  return { display: formatPhone(body, plus, ext), digits, trusted };
}

/** One consistent output shape: single spaces, hyphens kept, dots converted. */
function formatPhone(body: string, plus: boolean, ext: string): string {
  let out = body
    .replace(/\./g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\(\s*/g, "(")
    .replace(/\s*\)/g, ")")
    .replace(/\)(?=\d)/g, ") ")
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "")
    .trim();
  if (plus) out = `+${out}`;
  return ext ? `${out} ext. ${ext}` : out;
}

/**
 * Scan free text for phone-shaped tokens, rejecting measurement contexts.
 * Runs per line: a number never spans a block boundary, and joining lines is
 * how "Washington, DC 20546" + "(202) 358-0001" became one 15-digit "phone".
 */
function scanText(text: string, out: ParsedPhone[]): void {
  for (const line of text.split("\n")) scanLine(line, out);
}

function scanLine(text: string, out: ParsedPhone[]): void {
  for (const m of text.matchAll(CANDIDATE_RE)) {
    const start = m.index ?? 0;
    const before = text.slice(Math.max(0, start - 24), start);
    const after = text.slice(start + m[0].length, start + m[0].length + 8);
    if (CURRENCY_BEFORE_RE.test(before)) continue;
    if (CONTEXT_WORD_BEFORE_RE.test(before)) continue;
    if (UNIT_AFTER_RE.test(after)) continue;
    if (COUNT_AFTER_RE.test(after)) continue;
    const parsed = parsePhone(m[2] ? `${m[1]} ext ${m[2]}` : m[1]);
    if (parsed) out.push(parsed);
  }
}

function scoreOf(p: ParsedPhone): number {
  return (p.trusted ? 100 : 0) + p.digits.length + (p.display.startsWith("+") ? 5 : 0);
}

const stripTrunk = (digits: string) => digits.replace(/^0+/, "");

/**
 * Collapse duplicates: identical digits keep the best-formatted variant, and a
 * national number that is the tail of an international one (03001234567 vs
 * +923001234567) is dropped in favour of the fuller form.
 */
export function dedupePhones(found: ParsedPhone[]): string[] {
  const byDigits = new Map<string, ParsedPhone>();
  for (const p of found) {
    const cur = byDigits.get(p.digits);
    if (!cur || scoreOf(p) > scoreOf(cur)) byDigits.set(p.digits, p);
  }

  const all = [...byDigits.values()];
  const kept = all.filter((p) => {
    const tail = stripTrunk(p.digits);
    if (tail.length < 8) return true;
    return !all.some((q) => {
      if (q === p || q.digits.length <= p.digits.length) return false;
      const other = stripTrunk(q.digits);
      return other.endsWith(tail) && other.length - tail.length <= 4;
    });
  });

  return kept.sort((a, b) => a.digits.localeCompare(b.digits)).map((p) => p.display);
}

/** Numbers the markup itself declares as phones. */
function collectDeclared(html: string, out: ParsedPhone[]): void {
  const $ = cheerio.load(html);

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    const m = href.match(/^(?:tel|callto|sms|fax):(.+)$/i);
    if (!m) return;
    let raw = m[1].split("?")[0].trim();
    try {
      raw = decodeURIComponent(raw);
    } catch {
      /* keep the raw value */
    }
    const parsed = parsePhone(raw, true);
    if (parsed) out.push(parsed);
  });

  $('[itemprop="telephone"], [itemprop="faxNumber"]').each((_, el) => {
    const raw = ($(el).attr("content") || $(el).text() || "").trim();
    const parsed = parsePhone(raw, true);
    if (parsed) out.push(parsed);
  });

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    for (const m of raw.matchAll(
      /"(?:telephone|phone|phoneNumber|contactPhone|faxNumber)"\s*:\s*"([^"]{5,40})"/gi,
    )) {
      const parsed = parsePhone(m[1], true);
      if (parsed) out.push(parsed);
    }
  });
}

/** All valid phone candidates on a page, before cross-page de-duplication. */
export function extractPhoneCandidates(html: string): ParsedPhone[] {
  const found: ParsedPhone[] = [];
  collectDeclared(html, found);
  scanText(visibleText(html), found);
  return found;
}

/** Normalized, de-duplicated phone numbers for a single page. */
export function extractPhones(html: string): string[] {
  return dedupePhones(extractPhoneCandidates(html));
}
