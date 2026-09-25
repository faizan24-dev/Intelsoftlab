// Step A — syntax, TLD sanity, and typo detection.

/**
 * Practical RFC 5322 subset: what real mail servers actually accept.
 * Quoted local parts and IP-literal domains are rejected on purpose — they are
 * valid on paper and a red flag in a lead list.
 */
const EMAIL_RE =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;

// Enough of the TLD space to catch ".con", ".cmo", ".comm" and friends.
const KNOWN_TLDS = new Set([
  "com", "org", "net", "edu", "gov", "mil", "int", "info", "biz", "name", "pro",
  "io", "co", "ai", "app", "dev", "me", "tv", "cc", "xyz", "online", "site",
  "shop", "store", "tech", "cloud", "agency", "studio", "design", "media",
  "digital", "group", "team", "world", "life", "live", "news", "blog", "page",
  "link", "email", "systems", "solutions", "services", "company", "ventures",
  "capital", "consulting", "marketing", "software", "finance", "health", "law",
  "academy", "care", "center", "church", "city", "click", "club", "education",
  "energy", "events", "expert", "fund", "gallery", "global", "guru", "host",
  "institute", "network", "partners", "press", "school", "science", "social",
  "space", "support", "today", "tools", "training", "university", "work",
  "works", "zone", "ac", "ad", "ae", "af", "ag", "al", "am", "ao", "ar", "at",
  "au", "az", "ba", "bd", "be", "bg", "bh", "bo", "br", "bw", "by", "ca", "ch",
  "cl", "cn", "cr", "cy", "cz", "de", "dk", "do", "dz", "ec", "ee", "eg", "es",
  "eu", "fi", "fr", "ge", "gh", "gr", "gt", "hk", "hr", "hu", "id", "ie", "il",
  "in", "iq", "ir", "is", "it", "jo", "jp", "ke", "kr", "kw", "kz", "lb", "lk",
  "lt", "lu", "lv", "ly", "ma", "md", "mk", "mt", "mu", "mx", "my", "ng", "nl",
  "no", "np", "nz", "om", "pa", "pe", "ph", "pk", "pl", "pt", "py", "qa", "ro",
  "rs", "ru", "sa", "se", "sg", "si", "sk", "sn", "th", "tn", "tr", "tw", "tz",
  "ua", "ug", "uk", "us", "uy", "uz", "ve", "vn", "za", "zm", "zw",
]);

// Domains people mistype most often.
const POPULAR_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com",
  "hotmail.co.uk", "outlook.com", "live.com", "msn.com", "aol.com",
  "icloud.com", "me.com", "protonmail.com", "proton.me", "zoho.com",
  "yandex.com", "mail.com", "gmx.com", "gmx.de", "comcast.net", "verizon.net",
];

/** Damerau–Levenshtein, capped — we only care about distances of 1 or 2. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      // Transposition ("gmial" → "gmail")
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

/** "user@gmial.com" → "user@gmail.com". Returns null when nothing is close. */
export function suggestCorrection(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (POPULAR_DOMAINS.includes(domain)) return null;

  let best: { domain: string; distance: number } | null = null;
  for (const candidate of POPULAR_DOMAINS) {
    const distance = editDistance(domain, candidate);
    if (distance <= 2 && (!best || distance < best.distance)) best = { domain: candidate, distance };
  }
  if (best) return `${local}@${best.domain}`;

  // A plausible domain with an implausible TLD: "acme.con" → "acme.com".
  const labels = domain.split(".");
  const tld = labels[labels.length - 1];
  if (!KNOWN_TLDS.has(tld)) {
    for (const candidate of ["com", "net", "org", "co", "io"]) {
      if (editDistance(tld, candidate) === 1) {
        return `${local}@${[...labels.slice(0, -1), candidate].join(".")}`;
      }
    }
  }
  return null;
}

export interface SyntaxResult {
  valid: boolean;
  reason?: string;
  suggestion?: string;
  localPart: string;
  domain: string;
}

export function checkSyntax(raw: string): SyntaxResult {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  const localPart = at > 0 ? email.slice(0, at) : "";
  const domain = at > 0 ? email.slice(at + 1) : "";
  const fail = (reason: string): SyntaxResult => ({
    valid: false,
    reason,
    suggestion: suggestCorrection(email) ?? undefined,
    localPart,
    domain,
  });

  if (!email) return fail("No email address was provided.");
  if (/\s/.test(email)) return fail("An email address cannot contain spaces.");
  if (at < 1) return fail("An email address needs a local part and a domain separated by “@”.");
  if (email.indexOf("@") !== at) return fail("An email address cannot contain more than one “@”.");
  if (email.length > 254) return fail("This address is longer than the 254-character limit.");
  if (localPart.length > 64) return fail("The part before “@” is longer than the 64-character limit.");
  if (localPart.startsWith(".") || localPart.endsWith("."))
    return fail("The part before “@” cannot start or end with a dot.");
  if (localPart.includes("..")) return fail("The part before “@” cannot contain two dots in a row.");
  if (!domain.includes(".")) return fail("The domain is missing a top-level domain, such as “.com”.");
  if (domain.startsWith("-") || domain.endsWith("-"))
    return fail("The domain cannot start or end with a hyphen.");
  if (!EMAIL_RE.test(email)) return fail("This address contains characters that are not allowed.");

  const tld = domain.split(".").pop()!;
  if (!KNOWN_TLDS.has(tld)) {
    const suggestion = suggestCorrection(email);
    // An unrecognised TLD is not automatically wrong — new gTLDs appear all the
    // time — so only fail when a near-miss correction exists.
    if (suggestion) {
      return { valid: false, reason: `“.${tld}” does not look like a real top-level domain.`, suggestion, localPart, domain };
    }
  }

  return { valid: true, suggestion: suggestCorrection(email) ?? undefined, localPart, domain };
}
