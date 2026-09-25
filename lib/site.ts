// Central site configuration — brand name, nav, and tool catalog.
// Change `name` / `tagline` here to rebrand the whole site.

export const siteConfig = {
  name: "IntelSoftLab",
  tagline: "Lead generation & data extraction tools that scale with you.",
  domain: "intelsoftlab.com",
  email: "hello@intelsoftlab.com",
  phone: "+1 (555) 010-2040",
  address: "Remote-first · Worldwide",
};

export interface ToolItem {
  name: string;
  slug: string;
  href: string;
  description: string;
  icon: string; // emoji placeholder — swap for real icons/logo later
  status: "live" | "soon";
  group: "Email Marketing" | "Utility Tools";
}

export const tools: ToolItem[] = [
  {
    name: "Website Extractor",
    slug: "website-extractor",
    href: "/tools/website-extractor",
    description:
      "Crawl any website and pull out emails, phone numbers, and social profiles — single URL or in bulk, exported to Excel.",
    icon: "🕷️",
    status: "live",
    group: "Utility Tools",
  },
  {
    name: "Web Email Finder",
    slug: "web-email-finder",
    href: "/tools/web-email-finder",
    description: "Instantly find the contact emails behind any domain.",
    icon: "📧",
    status: "live",
    group: "Email Marketing",
  },
  {
    name: "Real Email Verifier",
    slug: "email-verifier",
    href: "/tools/real-email-verifier",
    description: "Validate deliverability and remove bounces before you send.",
    icon: "✅",
    status: "live",
    group: "Email Marketing",
  },
  {
    name: "Bulk Mailer",
    slug: "bulk-mailer",
    href: "#",
    description: "Send personalized campaigns to thousands of leads at once.",
    icon: "📨",
    status: "soon",
    group: "Email Marketing",
  },
  {
    name: "Google Map Leads Finder",
    slug: "map-leads-finder",
    href: "#",
    description: "Extract business leads directly from map search results.",
    icon: "📍",
    status: "soon",
    group: "Email Marketing",
  },
  {
    name: "Merge CSV Files",
    slug: "merge-csv",
    href: "#",
    description: "Combine and de-duplicate multiple lead lists in one click.",
    icon: "🗂️",
    status: "soon",
    group: "Utility Tools",
  },
  {
    name: "URL Opener",
    slug: "url-opener",
    href: "#",
    description: "Open hundreds of URLs in sequence for fast review.",
    icon: "🔗",
    status: "soon",
    group: "Utility Tools",
  },
  {
    name: "SSL Certificate Generator",
    slug: "ssl-generator",
    href: "#",
    description: "Generate and inspect SSL certificates for any domain.",
    icon: "🔒",
    status: "soon",
    group: "Utility Tools",
  },
];

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Tools", href: "/tools" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// ── Full services catalog (the 19 features) ──────────────────────────────────
// `delivery`: "self-serve" → runs live in the Website Extractor.
//             "managed"    → done-for-you engagement via the request form.
export type Delivery = "self-serve" | "managed";

export interface ServiceItem {
  n: number;
  name: string;
  description: string;
  category: string;
  delivery: Delivery;
  href: string;
}

const EXTRACTOR = "/tools/website-extractor";
const REQUEST = "/services/request";

export const services: ServiceItem[] = [
  { n: 1, name: "Email Scraping", category: "Contact & Leads", delivery: "self-serve", href: EXTRACTOR, description: "Extract business emails from websites — including obfuscated and mailto addresses." },
  { n: 2, name: "Phone Number Scraping", category: "Contact & Leads", delivery: "self-serve", href: EXTRACTOR, description: "Collect publicly listed phone numbers from tel: links and page text." },
  { n: 3, name: "Contact Information Extraction", category: "Contact & Leads", delivery: "self-serve", href: EXTRACTOR, description: "Find emails, phone numbers, addresses, and contact pages in one pass." },
  { n: 4, name: "Business Lead Generation", category: "Contact & Leads", delivery: "managed", href: REQUEST, description: "We build targeted lists of potential customers from your criteria." },
  { n: 5, name: "Company Data Scraping", category: "Company & Market", delivery: "self-serve", href: EXTRACTOR, description: "Extract company name, website, logo, address, and profiles from structured data." },
  { n: 6, name: "Google Maps Data Collection", category: "Company & Market", delivery: "managed", href: REQUEST, description: "Collect publicly available business info where permitted (via the Places API)." },
  { n: 7, name: "Website Directory Scraping", category: "Company & Market", delivery: "managed", href: REQUEST, description: "Extract listings from online directories into a clean dataset." },
  { n: 8, name: "Social Profile Discovery", category: "Contact & Leads", delivery: "self-serve", href: EXTRACTOR, description: "Find publicly listed social media profile links across 8 platforms." },
  { n: 9, name: "Competitor Research", category: "Company & Market", delivery: "managed", href: REQUEST, description: "Collect publicly available competitor information for analysis." },
  { n: 10, name: "Product Data Scraping", category: "Commerce & Listings", delivery: "self-serve", href: EXTRACTOR, description: "Extract product names, prices, SKUs, brands, and availability from structured data." },
  { n: 11, name: "Real Estate Data Collection", category: "Commerce & Listings", delivery: "managed", href: REQUEST, description: "Extract publicly listed property information into spreadsheets." },
  { n: 12, name: "Job Listing Scraping", category: "Commerce & Listings", delivery: "self-serve", href: EXTRACTOR, description: "Collect job titles, companies, locations, and posting dates from structured data." },
  { n: 13, name: "SEO Data Extraction", category: "SEO & Tech", delivery: "self-serve", href: EXTRACTOR, description: "Collect titles, meta descriptions, headings, canonicals, OG tags, and link counts." },
  { n: 14, name: "Guest Post Prospecting", category: "SEO & Tech", delivery: "managed", href: REQUEST, description: "Build lists of relevant websites for legitimate outreach." },
  { n: 15, name: "Website Technology Detection", category: "SEO & Tech", delivery: "self-serve", href: EXTRACTOR, description: "Identify CMS, frameworks, analytics, and infrastructure a site uses." },
  { n: 16, name: "CSV / Excel Export", category: "Data Ops & Custom", delivery: "self-serve", href: EXTRACTOR, description: "Export everything collected into organized, formatted spreadsheets." },
  { n: 17, name: "Duplicate Removal", category: "Data Ops & Custom", delivery: "self-serve", href: EXTRACTOR, description: "Results are automatically de-duplicated across every page crawled." },
  { n: 18, name: "Keyword-Based Scraping", category: "Data Ops & Custom", delivery: "self-serve", href: EXTRACTOR, description: "Search crawled pages for specific terms and extract matching context." },
  { n: 19, name: "Custom Scraping", category: "Data Ops & Custom", delivery: "managed", href: REQUEST, description: "Tell us the sites and exact fields you need — we build it for you." },
];

export const serviceCategories = [
  "Contact & Leads",
  "Company & Market",
  "Commerce & Listings",
  "SEO & Tech",
  "Data Ops & Custom",
];
