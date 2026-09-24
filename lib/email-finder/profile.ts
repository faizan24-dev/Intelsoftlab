// Business-profile signals for the results grid: business name, contact form,
// and web category. Phone / address / social / tech reuse the scraper modules.

import * as cheerio from "cheerio";
import { visibleText } from "@/lib/scraper/text";

/** Readable company name: structured data → og:site_name → <title> stem. */
export function detectBusinessName(html: string, domain: string): string {
  const $ = cheerio.load(html);

  // 1. JSON-LD Organization / LocalBusiness name.
  let fromJsonLd = "";
  $('script[type="application/ld+json"]').each((_, el) => {
    if (fromJsonLd) return;
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    const m = raw.match(
      /"@type"\s*:\s*"(?:Organization|LocalBusiness|Corporation|Store|ProfessionalService|[A-Za-z]*Business)"[\s\S]{0,400}?"name"\s*:\s*"([^"]{2,80})"/,
    );
    if (m) fromJsonLd = m[1];
  });
  if (fromJsonLd) return clean(fromJsonLd);

  // 2. og:site_name / application-name.
  const og =
    $('meta[property="og:site_name"]').attr("content") ||
    $('meta[name="application-name"]').attr("content") ||
    "";
  if (og.trim()) return clean(og);

  // 3. The <title>, minus the tagline after a separator.
  const title = ($("title").first().text() || "").trim();
  if (title) {
    const stem = title.split(/\s+[|\-–—·•:]\s+/)[0].trim();
    if (stem.length >= 2 && stem.length <= 60) return clean(stem);
    return clean(title.slice(0, 60));
  }

  // 4. Fall back to the bare domain.
  return domain.replace(/^www\./, "").split(".")[0].replace(/[-_]/g, " ");
}

function clean(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^(?:welcome\s+to|home)\s*[-|:–—]?\s*/i, "")
    .replace(/^the\s+/i, (m) => m) // keep a leading "The" — it is part of names
    .trim()
    .slice(0, 80);
}

// A street/unit word or a real postal code is what separates a company address
// from a stray "2026, 2026, Namibe, Angola" lifted off an events page.
const STREET_WORD_RE =
  /\b(?:street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|court|ct|way|suite|ste|unit|apt|floor|fl|room|block|sector|phase|plot|house|building|bldg|tower|plaza|highway|hwy|parkway|pkwy|square|sq|place|pl|terrace|close|markaz|gali|po box)\b\.?/i;
const POSTAL_CODE_RE = /\b\d{5}(?:-\d{4})?\b|\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/;

/** Is this string plausibly the business's own postal address? */
export function looksLikeBusinessAddress(value: string): boolean {
  const t = value.trim();
  if (t.length < 12) return false;
  if (/^(?:19|20)\d{2}\b/.test(t)) return false; // starts with a year
  return STREET_WORD_RE.test(t) || POSTAL_CODE_RE.test(t);
}

/**
 * Does this page carry a real contact form?
 * A search box or a single-field newsletter signup does not count — we want a
 * form that can actually carry a message.
 */
export function hasContactForm(html: string): boolean {
  const $ = cheerio.load(html);
  let found = false;

  $("form").each((_, el) => {
    if (found) return;
    const form = $(el);
    const attrs = `${form.attr("id") || ""} ${form.attr("class") || ""} ${form.attr("action") || ""} ${form.attr("name") || ""}`.toLowerCase();
    if (/search|newsletter|subscribe|login|signin|sign-in|register|signup|sign-up|cart|checkout|filter/.test(attrs)) {
      return;
    }

    const hasTextarea = form.find("textarea").length > 0;
    const inputs = form.find("input");
    const hasEmailField = inputs
      .toArray()
      .some((i) => {
        const el$ = $(i);
        const sig = `${el$.attr("type") || ""} ${el$.attr("name") || ""} ${el$.attr("id") || ""} ${el$.attr("placeholder") || ""}`.toLowerCase();
        return sig.includes("email") || sig.includes("e-mail");
      });

    // A message box, or an email field alongside at least one other field.
    if (hasTextarea || (hasEmailField && inputs.length >= 2)) found = true;
  });
  if (found) return true;

  // Modern SPAs often render the fields with no <form> wrapper at all, so fall
  // back to the field signature: a message box plus somewhere to put an email.
  const textareas = $("textarea");
  if (textareas.length === 0) return false;
  const emailFieldOnPage = $("input")
    .toArray()
    .some((i) => {
      const el$ = $(i);
      const sig = `${el$.attr("type") || ""} ${el$.attr("name") || ""} ${el$.attr("id") || ""} ${el$.attr("placeholder") || ""}`.toLowerCase();
      return sig.includes("email") || sig.includes("e-mail");
    });
  return emailFieldOnPage;
}

// ── Web category ─────────────────────────────────────────────────────────────
// Keyword scoring over the page's own copy. Deliberately coarse: it labels the
// sector, it does not claim to know the business model.
const CATEGORY_RULES: { label: string; terms: string[] }[] = [
  { label: "Services / Digital Marketing", terms: ["digital marketing", "seo", "search engine optimization", "ppc", "social media marketing", "content marketing", "link building", "backlink", "marketing agency", "google ads", "adwords", "branding agency"] },
  { label: "Technology / SaaS", terms: ["saas", "platform", "api", "dashboard", "integrations", "free trial", "pricing plan", "cloud software", "automation tool", "subscription"] },
  { label: "Services / Software Development", terms: ["software development", "web development", "app development", "custom software", "mobile app", "developers", "it services", "outsourcing", "web design"] },
  { label: "E-commerce / Retail", terms: ["add to cart", "shop now", "free shipping", "checkout", "our products", "buy now", "online store", "shopping cart", "add to bag"] },
  { label: "Education", terms: ["students", "curriculum", "courses", "enroll", "university", "academy", "tuition", "admissions", "school", "training program", "certification"] },
  { label: "Healthcare", terms: ["patients", "clinic", "doctors", "medical", "health care", "treatment", "appointment", "dental", "hospital", "therapy"] },
  { label: "Real Estate", terms: ["properties", "real estate", "for sale", "listings", "rent", "realtor", "apartments", "square feet", "mortgage"] },
  { label: "Finance", terms: ["investment", "banking", "insurance", "loans", "financial services", "accounting", "tax", "wealth", "portfolio", "trading"] },
  { label: "Legal", terms: ["attorney", "law firm", "lawyer", "legal services", "litigation", "counsel", "solicitor", "paralegal"] },
  { label: "Travel & Hospitality", terms: ["hotel", "booking", "reservation", "tours", "flights", "travel", "resort", "accommodation", "itinerary"] },
  { label: "Food & Beverage", terms: ["menu", "restaurant", "reservations", "catering", "cafe", "recipes", "dining", "takeaway", "bakery"] },
  { label: "Media / Publishing", terms: ["articles", "newsroom", "latest news", "editorial", "magazine", "podcast", "subscribe to our newsletter", "journalism"] },
  { label: "Non-profit", terms: ["donate", "nonprofit", "non-profit", "charity", "volunteers", "our mission", "fundraising", "foundation"] },
  { label: "Manufacturing / Industrial", terms: ["manufacturing", "factory", "industrial", "machinery", "suppliers", "wholesale", "production line", "oem"] },
  { label: "Construction", terms: ["construction", "contractor", "renovation", "builders", "roofing", "plumbing", "remodeling", "architecture"] },
  { label: "Services / Consulting", terms: ["consulting", "consultancy", "advisory", "strategy", "business solutions", "our expertise"] },
];

/** Schema.org types that name the sector outright. */
const SCHEMA_CATEGORY: Record<string, string> = {
  store: "E-commerce / Retail",
  onlinestore: "E-commerce / Retail",
  restaurant: "Food & Beverage",
  hotel: "Travel & Hospitality",
  lodgingbusiness: "Travel & Hospitality",
  medicalorganization: "Healthcare",
  medicalclinic: "Healthcare",
  dentist: "Healthcare",
  hospital: "Healthcare",
  educationalorganization: "Education",
  school: "Education",
  collegeoruniversity: "Education",
  realestateagent: "Real Estate",
  financialservice: "Finance",
  bank: "Finance",
  insuranceagency: "Finance",
  attorney: "Legal",
  legalservice: "Legal",
  ngo: "Non-profit",
  homeandconstructionbusiness: "Construction",
  generalcontractor: "Construction",
};

/**
 * Best-guess sector label for the site, or "—" when nothing scores.
 * Weighted toward the title/description, which describe the business directly.
 */
export function classifyCategory(html: string): string {
  const $ = cheerio.load(html);

  // Structured data wins when it names a concrete business type.
  let schemaHit = "";
  $('script[type="application/ld+json"]').each((_, el) => {
    if (schemaHit) return;
    for (const m of $(el).contents().text().matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)) {
      const label = SCHEMA_CATEGORY[m[1].toLowerCase()];
      if (label) {
        schemaHit = label;
        break;
      }
    }
  });
  if (schemaHit) return schemaHit;

  const title = ($("title").first().text() || "").toLowerCase();
  const description = ($('meta[name="description"]').attr("content") || "").toLowerCase();
  const keywords = ($('meta[name="keywords"]').attr("content") || "").toLowerCase();
  const headings = $("h1, h2")
    .map((_, el) => $(el).text())
    .get()
    .join(" ")
    .toLowerCase();
  const body = visibleText(html).toLowerCase().slice(0, 12000);

  const strong = `${title} ${description} ${keywords} ${headings}`;

  let best = { label: "", score: 0 };
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const term of rule.terms) {
      if (strong.includes(term)) score += 3; // title/meta/headings carry weight
      else if (body.includes(term)) score += 1;
    }
    if (score > best.score) best = { label: rule.label, score };
  }
  return best.score >= 3 ? best.label : "—";
}
