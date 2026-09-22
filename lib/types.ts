// Shared types for the WebScrapeX engine and UI.

export type SocialPlatform =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "twitter"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "whatsapp";

export type SocialLinks = Record<SocialPlatform, string[]>;

export interface Metadata {
  title: string;
  description: string;
  domain: string;
}

// ── Rich extraction types ────────────────────────────────────────────────────
export interface SeoData {
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  metaKeywords: string;
  canonical: string;
  robots: string;
  viewport: boolean;
  lang: string;
  h1: string[];
  h2: string[];
  h3: string[];
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  imageCount: number;
  imagesMissingAlt: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
}

export interface CompanyData {
  name: string;
  legalName?: string;
  url?: string;
  logo?: string;
  email?: string;
  telephone?: string;
  address?: string;
  sameAs?: string[];
  description?: string;
}

export interface ProductItem {
  name: string;
  price?: string;
  currency?: string;
  sku?: string;
  brand?: string;
  category?: string;
  availability?: string;
  url?: string;
}

export interface JobItem {
  title: string;
  company?: string;
  location?: string;
  employmentType?: string;
  datePosted?: string;
  url?: string;
}

export interface KeywordHit {
  keyword: string;
  count: number;
  pages: number;
  sample: string;
}

export interface TechItem {
  name: string;
  category: string;
}

export interface ScrapeResult {
  domain: string;
  url: string;
  metadata: Partial<Metadata>;
  emails: string[];
  phones: string[];
  addresses: string[];
  social_links: SocialLinks;
  company: CompanyData | null;
  seo: SeoData | null;
  tech: TechItem[];
  products: ProductItem[];
  jobs: JobItem[];
  keyword_hits: KeywordHit[];
  pages_crawled: string[];
  errors: string[];
  logs: string[];
  elapsed: number;
  status: "success" | "fail";
}

// Progress callback signature (mirrors the Python progress_cb(pct, msg)).
export type ProgressCallback = (pct: number, msg: string) => void;

// Streamed events sent from the API to the browser during a crawl.
export type ScrapeStreamEvent =
  | { type: "progress"; pct: number; msg: string }
  | { type: "log"; msg: string }
  | { type: "result"; result: ScrapeResult }
  | { type: "error"; msg: string };

// Bulk streaming events (one crawl per URL).
export type BulkStreamEvent =
  | { type: "start"; total: number; urls: string[] }
  | { type: "url_start"; url: string; index: number }
  | { type: "url_done"; url: string; index: number; result: ScrapeResult }
  | { type: "url_error"; url: string; index: number; msg: string }
  | { type: "done"; results: ScrapeResult[] };
