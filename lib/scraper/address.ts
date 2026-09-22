// Physical / postal address extraction.
//
// Previously the Addresses tab was fed by a single US-shaped street regex plus
// whatever JSON-LD happened to contain — and because schema.org markup often
// carries only `addressCountry`, the tab ended up listing bare country codes
// ("PK") instead of addresses. This module:
//   1. reads structured addresses (schema.org microdata, <address> tags),
//   2. mines address-bearing containers (footer, .address, .location, contact),
//   3. falls back to street/locality regexes over visible text,
//   4. expands ISO country codes to names and refuses country-only values,
//   5. validates, de-duplicates and prunes overlapping results.

import { loadVisible, textLines, visibleText } from "@/lib/scraper/text";

// ── Country codes ────────────────────────────────────────────────────────────
// Built once from ICU rather than hand-maintained, so every ISO 3166-1 alpha-2
// code resolves ("PK" → "Pakistan").
const REGION_NAMES: Map<string, string> = (() => {
  const map = new Map<string, string>();
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const name = display.of(code);
        if (name && name !== code) map.set(code, name);
      }
    }
  } catch {
    /* no ICU data — codes simply pass through unexpanded */
  }
  return map;
})();

// Informal country tokens people actually type, mapped to the canonical name.
const COUNTRY_ALIASES: Record<string, string> = {
  USA: "United States",
  US: "United States",
  "U.S.": "United States",
  "U.S.A.": "United States",
  UK: "United Kingdom",
  "U.K.": "United Kingdom",
  UAE: "United Arab Emirates",
  KSA: "Saudi Arabia",
  ENGLAND: "England",
  SCOTLAND: "Scotland",
  WALES: "Wales",
  HOLLAND: "Netherlands",
};

const COUNTRY_NAME_SET = new Set(
  [...REGION_NAMES.values(), ...Object.values(COUNTRY_ALIASES)].map((n) => n.toLowerCase()),
);

/** "PK" → "Pakistan". Returns the input unchanged when it is not a code. */
export function countryName(raw: string): string {
  const t = raw.trim();
  const upper = t.toUpperCase();
  if (COUNTRY_ALIASES[upper]) return COUNTRY_ALIASES[upper];
  if (/^[A-Za-z]{2}$/.test(t)) return REGION_NAMES.get(upper) ?? t;
  return t;
}

/** True when the value carries no more information than "which country". */
export function isCountryOnly(raw: string): boolean {
  const t = raw.replace(/[\s.,]+$/g, "").replace(/^[\s.,]+/g, "").trim();
  if (!t) return true;
  if (/^[A-Za-z]{2,3}$/.test(t)) {
    const upper = t.toUpperCase();
    if (COUNTRY_ALIASES[upper] || REGION_NAMES.has(upper)) return true;
  }
  return COUNTRY_NAME_SET.has(t.toLowerCase());
}

// ── Address vocabulary ───────────────────────────────────────────────────────
const STREET_TYPES = [
  "street", "st", "avenue", "ave", "boulevard", "blvd", "road", "rd", "lane", "ln",
  "drive", "dr", "court", "ct", "way", "highway", "hwy", "square", "sq", "parkway",
  "pkwy", "place", "pl", "terrace", "trail", "crescent", "close", "circle", "cir",
  "alley", "bypass", "expressway", "freeway", "route", "rte", "walk", "quay",
  "esplanade", "strasse", "straße", "calle", "avenida", "rua", "via", "viale",
  "chaussee", "gatan", "vej", "plein", "laan", "straat",
];

const UNIT_TYPES = [
  "suite", "ste", "unit", "apt", "apartment", "floor", "fl", "room", "rm", "office",
  "building", "bldg", "block", "tower", "plaza", "level", "flat", "shop", "house",
  "plot", "sector", "phase", "villa", "wing", "complex", "centre", "center", "mall",
  "industrial area", "po box", "p.o. box", "gpo box", "postbox",
];

/**
 * Street/unit words double as ordinary English ("Way", "Close", "Place",
 * "Drive"), so they only count when written as part of a proper name — Title
 * Case or ALL CAPS. Without this, "$11M USD to close" parses as an address.
 */
const cased = (words: string[]): string =>
  words
    .flatMap((w) => [w.replace(/\b[a-z]/g, (c) => c.toUpperCase()), w.toUpperCase()])
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

const STREET_ALT = cased(STREET_TYPES);
const UNIT_ALT = cased(UNIT_TYPES);

const STREET_TYPE_RE = new RegExp(String.raw`\b(?:${STREET_ALT})\b\.?`);
const UNIT_TYPE_RE = new RegExp(String.raw`\b(?:${UNIT_ALT})\b\.?`);

// Postal codes we can recognise with confidence.
const STRONG_POSTAL_RE = new RegExp(
  [
    String.raw`\b\d{5}(?:-\d{4})?\b`, // US ZIP / ZIP+4
    String.raw`\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b`, // UK
    String.raw`\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b`, // Canada
    String.raw`\b\d{4}\s?[A-Z]{2}\b`, // Netherlands
  ].join("|"),
);
const WEAK_POSTAL_RE = /\b\d{4,6}\b/;

const COUNTRY_MENTION_RE = new RegExp(
  String.raw`(?:^|[\s,])(?:${[...COUNTRY_NAME_SET]
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})(?=$|[\s,.])`,
  "i",
);

// Labels that precede an address and should not become part of it.
// Split in two on purpose: words such as "Office" or "Store" are also unit
// designators ("Office 4, 2nd Floor, …"), so they may only be stripped when a
// colon or dash marks them as a label. The bare "Label 123 …" form is limited to
// words that are never part of the address itself.
const LABEL_WITH_SEP_RE =
  /^(?:our\s+)?(?:address(?:es)?|location|head\s+office|registered\s+office|main\s+office|office|branch|mailing\s+address|postal\s+address|visit\s+us|find\s+us|come\s+see\s+us|headquarters|hq|showroom|warehouse|store)\s*[:\-–—,]\s*/i;
const LABEL_BARE_RE =
  /^(?:our\s+)?(?:address(?:es)?|head\s+office|registered\s+office|main\s+office|mailing\s+address|postal\s+address|headquarters)\s+(?=\d)/i;

// Lines that are clearly not an address, whatever else they contain.
const NON_ADDRESS_RE =
  /(?:https?:|www\.|@[a-z0-9-]+\.|©|\{|\}|=>|\bfunction\b|\bvar\b|cookie|privacy policy|terms (?:of|and)|all rights reserved|copyright|subscribe|newsletter|read more|learn more|sign up|log in)/i;

// Verbs and connectives that mean we are looking at a sentence, not an address.
const PROSE_RE =
  /\b(?:was|were|is|are|has|have|had|will|would|should|could|says?|said|according|more than|less than|percent|includes?|including|because|however|meanwhile|during|after|before|between|through|about)\b/i;

// Lines that are only contact numbers / hours.
const CONTACT_ONLY_RE =
  /^(?:tel|telephone|phone|ph|mob|mobile|cell|fax|whatsapp|email|e-mail|call|hours?|open(?:ing)?\s+hours?|mon|monday)\b[^a-z]*/i;

const MIN_LEN = 12;
const MAX_LEN = 200;
const MAX_RESULTS = 60;

/**
 * Does this string read like a physical address?
 * Requires a street/unit keyword, a recognisable postal code, or a country
 * mention — always alongside a number and at least a couple of parts, which is
 * what separates "Plot 12, Street 5, Islamabad, Pakistan" from "Pakistan".
 */
export function isPlausibleAddress(raw: string): boolean {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length < MIN_LEN || t.length > MAX_LEN) return false;
  if (NON_ADDRESS_RE.test(t)) return false;
  if (PROSE_RE.test(t)) return false;
  if (CONTACT_ONLY_RE.test(t)) return false;
  if (isCountryOnly(t)) return false;

  const words = t.split(/\s+/);
  if (words.length < 3 || words.length > 40) return false;

  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (letters < 8) return false;
  const digits = (t.match(/\d/g) || []).length;
  if (digits / t.length > 0.45) return false; // phone / id / coordinate soup
  if (!/[A-Za-z]{3}/.test(t)) return false;

  const parts = t.split(",").map((p) => p.trim()).filter(Boolean);
  const hasNumber = /\d/.test(t);
  const hasStreet = STREET_TYPE_RE.test(t);
  const hasUnit = UNIT_TYPE_RE.test(t);
  const hasStrongPostal = STRONG_POSTAL_RE.test(t);
  const hasCountry = COUNTRY_MENTION_RE.test(t);

  // Plenty of real addresses carry no house number or postcode at all
  // ("College Road, Bahawalpur, Punjab, Pakistan"). Those need a street/unit
  // keyword anchored by a named country and several parts — otherwise a street
  // word on its own also matches navigation copy ("The Apache Way").
  if (!hasNumber) return (hasStreet || hasUnit) && hasCountry && parts.length >= 3;

  if (hasStreet || hasUnit) return true;
  if (hasStrongPostal && parts.length >= 2) return true;
  if (hasCountry && parts.length >= 3) return true;
  if (parts.length >= 3 && WEAK_POSTAL_RE.test(t) && hasCountry) return true;
  return false;
}

/**
 * Looser gate for sources that *declare* themselves as addresses (JSON-LD,
 * microdata, <address>): they only have to be more than a country and read like
 * a multi-part postal line, not satisfy the prose heuristics above.
 */
export function hasAddressSubstance(raw: string): boolean {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length < MIN_LEN || t.length > MAX_LEN) return false;
  if (isCountryOnly(t)) return false;
  if (NON_ADDRESS_RE.test(t)) return false;
  if (t.split(/\s+/).length < 2) return false;
  if ((t.match(/[A-Za-z]/g) || []).length < 6) return false;
  return t.includes(",") || /\d/.test(t);
}

/** Strip labels, stray punctuation and doubled separators. */
function cleanCandidate(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(LABEL_WITH_SEP_RE, "")
    .replace(LABEL_BARE_RE, "")
    .replace(/\s*[|·•]\s*/g, ", ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/^[\s,;:|\-–—]+/, "")
    .replace(/[\s,;:|]+$/, "")
    // Trailing sentence period, but not an abbreviation ("… St.", "… Ave.").
    .replace(/([A-Za-z]{4,})\.$/, "$1")
    .trim();
}

// ── Regex mining over free text ──────────────────────────────────────────────
// "123 Main Street, Suite 100, Springfield, IL 62704"
// Case-sensitive by design (see `cased`): street names are proper nouns.
const NUMBERED_STREET_RE = new RegExp(
  String.raw`\b\d{1,6}[A-Za-z]?(?:\s*[-–/]\s*\d{1,6}[A-Za-z]?)?,?\s+` +
    String.raw`(?:[A-Z0-9][A-Za-z0-9.'&\-]*\s+){0,4}` +
    String.raw`(?:${STREET_ALT})\b\.?` +
    // Directional suffix: "300 E. Street SW", "1200 Main St NW".
    String.raw`(?:\s+(?:NE|NW|SE|SW|N|S|E|W|North|South|East|West)\b\.?)?` +
    String.raw`(?:\s*,?\s*(?:${UNIT_ALT})\b\.?\s*#?\s*[\w\-]+)?` +
    String.raw`(?:\s*,\s*[A-Za-z][A-Za-z.'\-\s]{1,30})?` +
    String.raw`(?:\s*,\s*[A-Za-z][A-Za-z.'\-\s]{1,30})?` +
    String.raw`(?:\s*,?\s*(?:[A-Z]{2}\s*)?\d{4,6}(?:-\d{4})?)?` +
    String.raw`(?:\s*,\s*[A-Za-z][A-Za-z.'\-\s]{1,28})?`,
  "g",
);

// "Plot 12, Street 5, Sector F-8, Islamabad" — unit-keyword-led international form.
const UNIT_LED_RE = new RegExp(
  // The lookbehind stops it from starting mid-address: in "12 Main St, Suite 4,
  // Springfield" the "Suite 4, …" part continues an address, it does not open one.
  String.raw`(?<!,\s?)\b(?:${UNIT_ALT}|${cased(["street", "road", "gali", "mohalla", "near"])})\b\.?\s*#?\s*` +
    // The designator must contain a digit ("Plot 12", "Sector F-8", "Office 4B"),
    // otherwise the keyword just starts a sentence ("House. Meanwhile, …").
    String.raw`(?=[A-Za-z0-9./\-]{0,10}\d)[A-Za-z0-9][A-Za-z0-9.'&/\-]{0,14}` +
    String.raw`(?:\s*,\s*[A-Za-z0-9][A-Za-z0-9.'&/#\-\s]{1,34}){2,4}`,
  "g",
);

/** Does this line open a fresh address, rather than continue the previous one? */
function startsNewAddress(line: string): boolean {
  const t = cleanCandidate(line);
  if (!t) return false;
  const anchored = new RegExp(`^(?:${NUMBERED_STREET_RE.source})`, "i");
  return anchored.test(t) || LABEL_WITH_SEP_RE.test(line) || LABEL_BARE_RE.test(line);
}

/**
 * Could this line be the earlier half of an address split across <br>s?
 * Address fragments are short and unpunctuated ("College Road", "Office 4");
 * a sentence of marketing copy is neither, and must not be glued on.
 */
function isAddressFragmentLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  if (/[.!?:;]$/.test(t)) return false;
  return !PROSE_RE.test(t) && !NON_ADDRESS_RE.test(t) && !CONTACT_ONLY_RE.test(t);
}

/** Does this line's last comma-part name a country? */
function endsWithCountry(line: string): boolean {
  const tail = line.replace(/[\s.,;:|]+$/, "");
  const lastPart = tail.split(",").pop()?.trim() ?? "";
  return Boolean(lastPart) && isCountryOnly(lastPart);
}

/** Ends with a country name or postal code — nothing more to append. */
function looksComplete(candidate: string): boolean {
  const tail = candidate.split(",").pop()?.trim() ?? "";
  if (!tail) return false;
  if (isCountryOnly(tail)) return true;
  return new RegExp(`(?:${STRONG_POSTAL_RE.source})$`).test(candidate);
}

function mineRegex(text: string, out: Set<string>): void {
  for (const re of [NUMBERED_STREET_RE, UNIT_LED_RE]) {
    for (const m of text.matchAll(re)) {
      const candidate = cleanCandidate(m[0]);
      if (isPlausibleAddress(candidate)) out.add(candidate);
    }
  }
}

/**
 * Harvest from a block of lines. In `strict` mode only regex-matched spans are
 * kept (used for the whole page); otherwise whole lines — and short runs of
 * consecutive lines, since addresses are usually split across <br>s — are
 * accepted when they read as an address.
 */
function harvestLines(lines: string[], out: Set<string>, strict: boolean): void {
  // Containers are small; the whole-page pass has to reach an address that sits
  // in the middle of a long page (a <p> in the body, with no address markup).
  const limit = strict ? 4000 : 120;
  if (!strict) {
    let i = 0;
    while (i < lines.length && i < limit) {
      let best = "";
      let bestSpan = 1;
      for (let span = 1; span <= 4 && i + span <= lines.length; span++) {
        // Never swallow a line that begins an address of its own.
        if (span > 1 && startsNewAddress(lines[i + span - 1])) break;
        const candidate = cleanCandidate(lines.slice(i, i + span).join(", "));
        if (candidate.length > MAX_LEN) break;
        if (isPlausibleAddress(candidate)) {
          best = candidate;
          bestSpan = span;
          // A country or postal code at the end means the address is complete.
          if (looksComplete(candidate)) break;
        }
      }
      if (best) {
        out.add(best);
        i += bestSpan;
      } else {
        i += 1;
      }
    }
  }
  for (let i = 0; i < lines.length && i < limit; i++) {
    mineRegex(lines.slice(i, i + 4).join(", "), out);
    // The regexes above are all number-led, so a numberless address is only
    // reachable through its country: "…, College Road, Bahawalpur, Pakistan".
    // Walk back a line or two in case the street and the city were split.
    if (!endsWithCountry(lines[i])) continue;
    // How far back the address may reach: preceding fragment lines that do not
    // already end in a country of their own (those are addresses in their own
    // right). Longest join first, so a street line and its city/postcode line
    // come back as one address instead of two halves.
    let maxBack = 0;
    while (
      maxBack < 4 && // inline spans can split one address over several lines
      i - maxBack - 1 >= 0 &&
      isAddressFragmentLine(lines[i - maxBack - 1]) &&
      !endsWithCountry(lines[i - maxBack - 1])
    ) {
      maxBack++;
    }
    let chosen = "";
    for (let back = 0; back <= maxBack; back++) {
      const candidate = cleanCandidate(lines.slice(i - back, i + 1).join(", "));
      if (candidate.length > MAX_LEN) break;
      if (!isPlausibleAddress(candidate)) continue;
      chosen = candidate;
      // Once the candidate carries a street/unit keyword the address is whole;
      // reaching further back only glues on headings and nav links.
      if (STREET_TYPE_RE.test(candidate) || UNIT_TYPE_RE.test(candidate)) break;
    }
    if (chosen) out.add(chosen);
  }
}

// ── Structured sources ───────────────────────────────────────────────────────
const MICRODATA_PARTS = [
  "streetAddress",
  "addressLocality",
  "addressRegion",
  "postalCode",
  "addressCountry",
] as const;

/**
 * Join schema.org address parts. Country codes are expanded to names, and the
 * result is only meaningful when a street or locality is present — a lone
 * country is exactly the "PK" bug.
 */
export function joinAddressParts(parts: {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}): string | null {
  const street = parts.streetAddress?.trim();
  const locality = parts.addressLocality?.trim();
  const region = parts.addressRegion?.trim();
  const postal = parts.postalCode?.trim();
  const country = parts.addressCountry?.trim();
  if (!street && !locality && !postal && !region) return null; // country-only
  if (!street && !locality) return null; // region/postcode alone is not an address

  const tail = [postal, country ? countryName(country) : undefined].filter(Boolean).join(" ");
  const joined = [street, locality, region, tail].filter(Boolean).join(", ");
  const clean = cleanCandidate(joined);
  return clean.length >= MIN_LEN ? clean : null;
}

const HINT_SELECTOR = [
  "address",
  '[itemtype*="PostalAddress" i]',
  '[itemprop="address"]',
  '[itemprop="streetAddress"]',
  '[class*="address" i]',
  '[id*="address" i]',
  '[class*="addr" i]',
  '[class*="location" i]',
  '[id*="location" i]',
  '[class*="contact-info" i]',
  '[class*="contact-detail" i]',
  '[class*="branch" i]',
  '[class*="office" i]',
  "footer",
  '[class*="footer" i]',
  "#footer",
].join(", ");

// ── Public API ───────────────────────────────────────────────────────────────
export function extractAddresses(html: string): string[] {
  const found = new Set<string>();
  const $ = loadVisible(html);

  // 1. schema.org microdata — assemble from the individual itemprops.
  $('[itemtype*="PostalAddress" i]').each((_, el) => {
    const parts: Record<string, string> = {};
    for (const prop of MICRODATA_PARTS) {
      const node = $(el).find(`[itemprop="${prop}"]`).first();
      const value = (node.attr("content") || node.text() || "").replace(/\s+/g, " ").trim();
      if (value) parts[prop] = value;
    }
    const joined = joinAddressParts(parts);
    if (joined) found.add(joined);
  });

  // 2. Address-bearing containers. Only the innermost ones: a <footer> wrapping
  //    a .address block would otherwise join unrelated sibling lines into one
  //    Frankenstein "address". Smallest first so tight matches win.
  const hints = $(HINT_SELECTOR)
    .toArray()
    .filter((el) => $(el).find(HINT_SELECTOR).length === 0);
  hints.sort((a, b) => $(a).text().length - $(b).text().length);
  for (const el of hints.slice(0, 40)) {
    const lines = textLines($(el).text());
    if (!lines.length || lines.join(" ").length > 4000) continue;
    harvestLines(lines, found, false);
  }

  // 3. Whole-page fallback: regex spans only, so prose cannot leak in.
  harvestLines(textLines(visibleText(html)), found, true);

  return finalizeAddresses([...found]);
}

/**
 * Normalize, drop country-only values, and remove entries fully contained in a
 * longer one (a bare street line vs. the same street with city and country).
 */
export function finalizeAddresses(list: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const raw of list) {
    const clean = cleanCandidate(raw ?? "");
    if (!clean || clean.length > MAX_LEN) continue;
    // Country-only values ("PK", "Pakistan") never belong in the address list.
    if (!hasAddressSubstance(clean)) continue;
    const key = clean.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const existing = byKey.get(key);
    if (!existing || clean.length > existing.length) byKey.set(key, clean);
  }

  const entries = [...byKey.entries()];
  const kept = entries
    .filter(([key]) =>
      !entries.some(([otherKey]) => otherKey !== key && otherKey.length > key.length && otherKey.includes(key)),
    )
    .map(([, value]) => value);

  return kept.sort((a, b) => a.localeCompare(b)).slice(0, MAX_RESULTS);
}
