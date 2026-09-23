// Email validation, false-positive filtering, and classification.
//
// The scraper's own junk filter is tuned for a broad crawl; an email *finder*
// needs to be stricter, because a single bogus row ("user@domain.com" lifted
// from a placeholder, or "logo@2x.png" lifted from a srcset) makes the whole
// list look untrustworthy.

import type { Confidence, EmailKind } from "@/lib/email-finder/types";

/** Full-match validation — deliberately stricter than the scanning pattern. */
const STRICT_EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

// File extensions that show up when a filename gets scraped as an address
// ("sprite@2x.png", "icon@3x.webp").
const ASSET_SUFFIXES = [
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico", ".bmp",
  ".css", ".js", ".mjs", ".json", ".xml", ".map", ".woff", ".woff2", ".ttf",
  ".otf", ".eot", ".mp4", ".webm", ".mp3", ".pdf", ".zip", ".gz",
];

// Domains that only ever appear in placeholder copy or vendor telemetry.
const PLACEHOLDER_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "example.co", "domain.com",
  "yourdomain.com", "your-domain.com", "mydomain.com", "email.com",
  "youremail.com", "your-email.com", "mail.com", "test.com", "sample.com",
  "mysite.com", "yoursite.com", "site.com", "website.com", "company.com",
  "yourcompany.com", "acme.com", "acme.org", "lorem.com", "ipsum.com",
  "localhost", "localhost.com", "sentry.io", "sentry-next.wixpress.com",
  "wixpress.com", "wix.com", "schema.org", "w3.org", "godaddy.com",
  // Machine endpoints that are shaped like addresses but reach no one.
  "calendar.google.com", "group.calendar.google.com", "groups.calendar.google.com",
  "bounce.bounces.google.com", "sentry.wixpress.com", "email.godaddy.com",
]);

// Local parts that are always filler, whatever the domain.
const PLACEHOLDER_LOCALS = new Set([
  "user", "username", "youremail", "your-email", "your_email", "email",
  "e-mail", "mail", "name", "yourname", "your-name", "firstname", "lastname",
  "first", "last", "someone", "somebody", "anyone", "test", "testing", "demo",
  "sample", "example", "foo", "bar", "baz", "johndoe", "john.doe", "jane.doe",
  "janedoe", "abc", "xyz", "xxx", "aaa", "string", "null", "undefined",
]);

// Addresses that exist but can never be written to.
const UNREACHABLE_LOCALS = new Set([
  "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply",
  "mailer-daemon", "postmaster", "bounce", "bounces", "notifications",
  "notification", "automated", "auto-reply", "autoreply",
]);

// Shared-inbox prefixes — real contacts, but not a named person.
const ROLE_LOCALS = new Set([
  "info", "contact", "contacts", "hello", "hi", "hey", "support", "help",
  "helpdesk", "sales", "admin", "administrator", "office", "team", "enquiry",
  "enquiries", "inquiry", "inquiries", "marketing", "press", "media", "pr",
  "careers", "career", "jobs", "job", "recruitment", "hr", "billing",
  "accounts", "accounting", "finance", "invoices", "legal", "privacy",
  "security", "abuse", "webmaster", "hostmaster", "service", "services",
  "customerservice", "customercare", "booking", "bookings", "reservations",
  "orders", "order", "shop", "store", "partners", "partnership", "business",
  "general", "ask", "reach", "connect", "welcome", "studio", "agency",
  "newsletter", "subscribe", "feedback", "reception", "front-desk", "mailbox",
  // Mailing-list inboxes and their control addresses — real, but not a person.
  "announce", "announcements", "list", "lists", "listserv", "discuss",
  "discussion", "users", "group", "groups", "unsubscribe", "request", "owner",
  "moderator", "noc", "ops", "root", "dev", "devel", "developers",
]);

const FREE_PROVIDERS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "ymail.com",
  "hotmail.com", "outlook.com", "live.com", "msn.com", "aol.com", "gmx.com",
  "gmx.de", "protonmail.com", "proton.me", "icloud.com", "me.com", "mac.com",
  "mail.ru", "yandex.com", "yandex.ru", "zoho.com", "qq.com", "163.com",
]);

/** Hex blobs and tracking ids that happen to be `@`-shaped. */
const HEX_BLOB_RE = /^[0-9a-f]{16,}$/;
const RETINA_SUFFIX_RE = /@[0-9]x$/;

// Enough of the TLD space to spot a domain that swallowed the next word of a
// sentence ("...write to fundraising@apache.org.Subscribe to the list").
const KNOWN_TLDS = new Set([
  "com", "org", "net", "edu", "gov", "mil", "int", "info", "biz", "name", "pro",
  "io", "co", "ai", "app", "dev", "me", "tv", "cc", "xyz", "online", "site",
  "shop", "store", "tech", "cloud", "agency", "studio", "design", "media",
  "digital", "group", "team", "world", "life", "live", "news", "blog", "page",
  "link", "email", "systems", "solutions", "services", "company", "ventures",
  "capital", "consulting", "marketing", "software", "finance", "health", "law",
  "ac", "ad", "ae", "af", "ag", "al", "am", "ao", "ar", "at", "au", "az", "ba",
  "bd", "be", "bg", "bh", "bo", "br", "bw", "by", "ca", "ch", "cl", "cn", "cr",
  "cy", "cz", "de", "dk", "do", "dz", "ec", "ee", "eg", "es", "eu", "fi", "fr",
  "ge", "gh", "gr", "gt", "hk", "hr", "hu", "id", "ie", "il", "in", "iq", "ir",
  "is", "it", "jo", "jp", "ke", "kr", "kw", "kz", "lb", "lk", "lt", "lu", "lv",
  "ly", "ma", "md", "mk", "mt", "mu", "mx", "my", "ng", "nl", "no", "np", "nz",
  "om", "pa", "pe", "ph", "pk", "pl", "pt", "py", "qa", "ro", "rs", "ru", "sa",
  "se", "sg", "si", "sk", "sn", "th", "tn", "tr", "tw", "tz", "ua", "ug", "uk",
  "us", "uy", "uz", "ve", "vn", "za", "zm", "zw",
]);

/**
 * Repair a domain that ran into the following sentence. Only trims when the
 * shorter form ends in a TLD we recognise *and* the longer one does not — so a
 * genuine rare gTLD ("acme.technology") is left alone.
 */
function repairDomain(domain: string): string {
  const labels = domain.split(".");
  if (labels.length < 3) return domain;
  if (KNOWN_TLDS.has(labels[labels.length - 1])) return domain;
  for (let drop = 1; drop <= 2 && labels.length - drop >= 2; drop++) {
    const candidate = labels.slice(0, labels.length - drop);
    if (KNOWN_TLDS.has(candidate[candidate.length - 1])) return candidate.join(".");
  }
  return domain;
}

/**
 * Lower-case, repair, and validate in one step.
 * Returns null when the candidate is not a usable address.
 */
export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return null;
  const email = `${trimmed.slice(0, at)}@${repairDomain(trimmed.slice(at + 1))}`;
  return isUsableEmail(email) ? email : null;
}

export function splitEmail(email: string): { local: string; domain: string } {
  const at = email.lastIndexOf("@");
  return { local: email.slice(0, at), domain: email.slice(at + 1) };
}

/**
 * Is this a real, contactable address — as opposed to a placeholder, an asset
 * filename, a telemetry endpoint, or an unattended mailbox?
 */
export function isUsableEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  if (!STRICT_EMAIL_RE.test(email)) return false;
  if (RETINA_SUFFIX_RE.test(email)) return false;
  if (ASSET_SUFFIXES.some((ext) => email.endsWith(ext))) return false;

  const { local, domain } = splitEmail(email);
  if (!local || !domain) return false;
  if (local.length > 64 || email.length > 254) return false;
  if (PLACEHOLDER_DOMAINS.has(domain)) return false;
  if (PLACEHOLDER_LOCALS.has(local)) return false;
  if (UNREACHABLE_LOCALS.has(local)) return false;
  if (HEX_BLOB_RE.test(local)) return false;
  // Machine-generated ids: a long unbroken run mixing letters and digits, e.g.
  // a Google Calendar address or a message-id.
  if (local.length >= 20 && !/[._+-]/.test(local) && /[a-z]/.test(local) && /\d/.test(local)) {
    return false;
  }
  // "u003e" style HTML-entity debris, and locals that are all digits.
  if (/^u[0-9a-f]{4}/.test(local)) return false;
  if (/^\d+$/.test(local)) return false;
  // A domain label made only of digits is an id, not a host.
  if (domain.split(".").some((part) => /^\d+$/.test(part))) return false;
  return true;
}

const NAME_LIKE_RE = /^[a-z]{2,}(?:[._-][a-z]{2,}){1,2}$/;
const INITIAL_NAME_RE = /^[a-z][._-][a-z]{3,}$/;

/** Personal (a named human), a shared role inbox, or unclassifiable. */
export function classifyEmail(email: string): EmailKind {
  const { local } = splitEmail(email.toLowerCase());
  const base = local.replace(/\+.*$/, ""); // strip +tags
  if (ROLE_LOCALS.has(base)) return "role";
  // "sales.uk", "jobs-eu", "vp-legal" — a role inbox with a prefix or suffix
  // still belongs to a department, not a person.
  const tokens = base.split(/[._-]/);
  if (tokens.some((t) => ROLE_LOCALS.has(t))) return "role";
  if (NAME_LIKE_RE.test(base) || INITIAL_NAME_RE.test(base)) return "personal";
  return "generic";
}

export interface ScoreInput {
  email: string;
  siteDomain: string;
  viaMailto: boolean;
  /** Found on a contact/about/team style page. */
  onContactPage: boolean;
  /** Number of distinct pages the address appeared on. */
  pageCount: number;
}

export interface ScoreOutput {
  score: number;
  confidence: Confidence;
  onSiteDomain: boolean;
}

/** True when the address lives on the site's own domain (or a subdomain). */
export function isOnSiteDomain(emailDomain: string, siteDomain: string): boolean {
  const site = siteDomain.toLowerCase().replace(/^www\./, "").split(":")[0];
  const mail = emailDomain.toLowerCase();
  if (!site) return false;
  if (mail === site || mail.endsWith("." + site)) return true;
  // company.com vs mail.company.co.uk — compare the registrable-ish stem.
  const stem = (host: string) => host.split(".").slice(-2).join(".");
  return stem(mail) === stem(site);
}

/**
 * Confidence is about "is this really a contact address for this site", not
 * about deliverability — nothing here verifies the mailbox exists.
 */
export function scoreEmail(input: ScoreInput): ScoreOutput {
  const { domain } = splitEmail(input.email.toLowerCase());
  const onSiteDomain = isOnSiteDomain(domain, input.siteDomain);
  const kind = classifyEmail(input.email);

  let score = 45;
  if (input.viaMailto) score += 25; // the site published it as a link
  if (input.onContactPage) score += 12;
  if (onSiteDomain) score += 15;
  if (input.pageCount > 1) score += 8;
  if (kind === "role" && onSiteDomain) score += 6;
  if (FREE_PROVIDERS.has(domain)) score -= 18;
  if ((input.email.match(/\d/g) || []).length >= 4) score -= 10;

  score = Math.max(5, Math.min(99, score));
  const confidence: Confidence = score >= 75 ? "high" : score >= 50 ? "medium" : "low";
  return { score, confidence, onSiteDomain };
}
