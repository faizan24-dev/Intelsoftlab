// Rich extraction — SEO, structured data (JSON-LD), addresses, company, keywords.
// All values come straight from the page's own markup, so they're accurate when present.

import * as cheerio from "cheerio";
import type {
  CompanyData,
  JobItem,
  ProductItem,
  SeoData,
} from "@/lib/types";
import { isSameDomain } from "@/lib/scraper/url";
import { parsePhone } from "@/lib/scraper/phone";
import { finalizeAddresses, hasAddressSubstance, joinAddressParts } from "@/lib/scraper/address";

// ── SEO ──────────────────────────────────────────────────────────────────────
export function extractSeo(html: string, url: string, baseDomain: string): SeoData {
  const $ = cheerio.load(html);
  const title = ($("title").first().text() || "").trim();
  const metaDescription = ($('meta[name="description"]').attr("content") || "").trim();
  const metaKeywords = ($('meta[name="keywords"]').attr("content") || "").trim();
  const canonical = ($('link[rel="canonical"]').attr("href") || "").trim();
  const robots = ($('meta[name="robots"]').attr("content") || "").trim();
  const viewport = $('meta[name="viewport"]').length > 0;
  const lang = ($("html").attr("lang") || "").trim();

  const headings = (sel: string, cap: number) =>
    $(sel)
      .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
      .get()
      .filter(Boolean)
      .slice(0, cap);

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const p = $(el).attr("property");
    const c = $(el).attr("content");
    if (p && c) ogTags[p] = c.trim();
  });
  const twitterTags: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const n = $(el).attr("name");
    const c = $(el).attr("content");
    if (n && c) twitterTags[n] = c.trim();
  });

  const images = $("img");
  const imagesMissingAlt = images.filter((_, el) => !($(el).attr("alt") || "").trim()).length;

  let internal = 0;
  let external = 0;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const abs = new URL(href, url).toString();
      if (isSameDomain(abs, baseDomain)) internal++;
      else external++;
    } catch {
      /* ignore */
    }
  });

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  return {
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    metaKeywords,
    canonical,
    robots,
    viewport,
    lang,
    h1: headings("h1", 10),
    h2: headings("h2", 20),
    h3: headings("h3", 20),
    ogTags,
    twitterTags,
    imageCount: images.length,
    imagesMissingAlt,
    wordCount,
    internalLinks: internal,
    externalLinks: external,
  };
}

// ── JSON-LD structured data ──────────────────────────────────────────────────
type JsonLdNode = Record<string, unknown>;

function collectJsonLd(html: string): JsonLdNode[] {
  const $ = cheerio.load(html);
  const nodes: JsonLdNode[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      pushNodes(parsed, nodes);
    } catch {
      /* malformed JSON-LD — skip */
    }
  });
  return nodes;
}

function pushNodes(value: unknown, out: JsonLdNode[]) {
  if (Array.isArray(value)) {
    value.forEach((v) => pushNodes(v, out));
  } else if (value && typeof value === "object") {
    const node = value as JsonLdNode;
    if (Array.isArray(node["@graph"])) pushNodes(node["@graph"], out);
    if (node["@type"]) out.push(node);
  }
}

function typeMatches(node: JsonLdNode, ...types: string[]): boolean {
  const t = node["@type"];
  const list = Array.isArray(t) ? t : [t];
  return list.some((x) => typeof x === "string" && types.some((want) => x.toLowerCase() === want.toLowerCase()));
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  return undefined;
}

/**
 * Format a JSON-LD address value. Plain strings are validated as addresses, and
 * PostalAddress objects go through `joinAddressParts`, which expands country
 * codes and rejects country-only values — the old code emitted a bare "PK"
 * whenever `addressCountry` was the only field present.
 */
function formatAddress(addr: unknown): string | undefined {
  if (typeof addr === "string") {
    const t = addr.replace(/\s+/g, " ").trim();
    return hasAddressSubstance(t) ? t : undefined;
  }
  if (addr && typeof addr === "object") {
    const a = addr as JsonLdNode;
    const country =
      asString(a.addressCountry) ??
      (a.addressCountry && typeof a.addressCountry === "object"
        ? asString((a.addressCountry as JsonLdNode).name) ??
          asString((a.addressCountry as JsonLdNode).identifier)
        : undefined);
    return (
      joinAddressParts({
        streetAddress: asString(a.streetAddress),
        addressLocality: asString(a.addressLocality),
        addressRegion: asString(a.addressRegion),
        postalCode: asString(a.postalCode),
        addressCountry: country,
      }) ?? undefined
    );
  }
  return undefined;
}

/** Pull every address reachable from a JSON-LD node into `out`. */
function collectNodeAddresses(node: JsonLdNode, out: Set<string>): void {
  // The node may *be* a PostalAddress (they are emitted as their own @type).
  if (typeMatches(node, "PostalAddress")) {
    const self = formatAddress(node);
    if (self) out.add(self);
  }
  const candidates: unknown[] = [node.address];
  for (const key of ["location", "hasPos", "areaServed", "jobLocation", "branch"] as const) {
    const value = node[key];
    if (Array.isArray(value)) value.forEach((v) => candidates.push((v as JsonLdNode)?.address));
    else if (value && typeof value === "object") candidates.push((value as JsonLdNode).address);
  }
  for (const c of candidates) {
    if (Array.isArray(c)) c.forEach((item) => { const a = formatAddress(item); if (a) out.add(a); });
    else {
      const a = formatAddress(c);
      if (a) out.add(a);
    }
  }
}

export interface StructuredResult {
  company: CompanyData | null;
  products: ProductItem[];
  jobs: JobItem[];
  addresses: string[];
}

export function extractStructured(html: string, pageUrl: string): StructuredResult {
  const nodes = collectJsonLd(html);
  let company: CompanyData | null = null;
  const products: ProductItem[] = [];
  const jobs: JobItem[] = [];
  const addresses = new Set<string>();

  for (const node of nodes) {
    // Organization / LocalBusiness → company
    if (!company && typeMatches(node, "Organization", "LocalBusiness", "Corporation", "Store")) {
      const addr = formatAddress(node.address);
      if (addr) addresses.add(addr);
      company = {
        name: asString(node.name) || "",
        legalName: asString(node.legalName),
        url: asString(node.url),
        logo: typeof node.logo === "string" ? node.logo : asString((node.logo as JsonLdNode)?.url),
        email: asString(node.email),
        telephone: parsePhone(asString(node.telephone) ?? "", true)?.display,
        address: addr,
        sameAs: Array.isArray(node.sameAs)
          ? (node.sameAs.filter((x) => typeof x === "string") as string[])
          : typeof node.sameAs === "string"
            ? [node.sameAs]
            : undefined,
        description: asString(node.description),
      };
    }

    // Any node carrying an address (incl. PostalAddress nodes and nested locations)
    collectNodeAddresses(node, addresses);

    // Product
    if (typeMatches(node, "Product") && products.length < 100) {
      const offers = (Array.isArray(node.offers) ? node.offers[0] : node.offers) as JsonLdNode | undefined;
      products.push({
        name: asString(node.name) || "",
        price: asString(offers?.price) ?? asString(offers?.lowPrice),
        currency: asString(offers?.priceCurrency),
        sku: asString(node.sku) ?? asString(node.mpn),
        brand: typeof node.brand === "string" ? node.brand : asString((node.brand as JsonLdNode)?.name),
        category: asString(node.category),
        availability: asString(offers?.availability)?.replace(/^https?:\/\/schema\.org\//, ""),
        url: asString(node.url) || pageUrl,
      });
    }

    // JobPosting
    if (typeMatches(node, "JobPosting") && jobs.length < 100) {
      const org = node.hiringOrganization as JsonLdNode | undefined;
      const loc = node.jobLocation as JsonLdNode | undefined;
      const address = loc ? formatAddress(loc.address) : undefined;
      jobs.push({
        title: asString(node.title) || "",
        company: typeof node.hiringOrganization === "string" ? node.hiringOrganization : asString(org?.name),
        location: address,
        employmentType: asString(node.employmentType),
        datePosted: asString(node.datePosted),
        url: asString(node.url) || pageUrl,
      });
    }
  }

  return {
    company: company && company.name ? company : null,
    products: products.filter((p) => p.name),
    jobs: jobs.filter((j) => j.title),
    addresses: finalizeAddresses([...addresses]),
  };
}

// Address extraction now lives in lib/scraper/address.ts.

// ── Keyword matching ─────────────────────────────────────────────────────────
export function matchKeywords(
  html: string,
  keywords: string[],
): { keyword: string; count: number; sample: string }[] {
  if (!keywords.length) return [];
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ");
  const lower = text.toLowerCase();
  const results: { keyword: string; count: number; sample: string }[] = [];

  for (const kwRaw of keywords) {
    const kw = kwRaw.trim();
    if (!kw) continue;
    const lk = kw.toLowerCase();
    let count = 0;
    let idx = lower.indexOf(lk);
    let sample = "";
    while (idx !== -1) {
      if (!sample) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + lk.length + 40);
        sample = (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
      }
      count++;
      idx = lower.indexOf(lk, idx + lk.length);
    }
    if (count > 0) results.push({ keyword: kw, count, sample });
  }
  return results;
}
