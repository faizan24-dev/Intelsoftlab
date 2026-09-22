// Website technology detection — signature-based (CMS, frameworks, analytics, etc.).
// Accurate because each rule matches a concrete artifact in the HTML or response headers.

import type { TechItem } from "@/lib/types";

interface TechRule {
  name: string;
  category: string;
  // Any matching signal flags the tech as present.
  html?: RegExp[];
  headers?: { key: string; value?: RegExp }[];
}

const RULES: TechRule[] = [
  // ── CMS ──
  { name: "WordPress", category: "CMS", html: [/wp-content|wp-includes/i, /<meta[^>]+name=["']generator["'][^>]+wordpress/i] },
  { name: "Drupal", category: "CMS", html: [/drupal\.settings|sites\/(default|all)\/(themes|modules)/i], headers: [{ key: "x-generator", value: /drupal/i }] },
  { name: "Joomla", category: "CMS", html: [/\/media\/(jui|system)\/|<meta[^>]+generator[^>]+joomla/i] },
  { name: "Wix", category: "CMS", html: [/static\.wixstatic\.com|wix\.com/i], headers: [{ key: "x-wix-request-id" }] },
  { name: "Squarespace", category: "CMS", html: [/squarespace\.com|static1\.squarespace/i], headers: [{ key: "server", value: /squarespace/i }] },
  { name: "Webflow", category: "CMS", html: [/<meta[^>]+generator[^>]+webflow|\.webflow\.io|assets\.website-files\.com/i] },
  { name: "Ghost", category: "CMS", html: [/<meta[^>]+generator[^>]+ghost/i] },
  { name: "HubSpot CMS", category: "CMS", html: [/hs-scripts\.com|hubspot/i] },

  // ── E-commerce ──
  { name: "Shopify", category: "E-commerce", html: [/cdn\.shopify\.com|shopify\.com\/s\/|window\.Shopify/i], headers: [{ key: "x-shopify-stage" }, { key: "x-shopid" }] },
  { name: "WooCommerce", category: "E-commerce", html: [/woocommerce|wp-content\/plugins\/woocommerce/i] },
  { name: "Magento", category: "E-commerce", html: [/\bmagento\b|Mage\.Cookies|mage\/requirejs|\/static\/version\d/i] },
  { name: "BigCommerce", category: "E-commerce", html: [/bigcommerce\.com|cdn\d*\.bigcommerce/i] },
  { name: "PrestaShop", category: "E-commerce", html: [/prestashop/i] },

  // ── JS frameworks ──
  { name: "Next.js", category: "JS Framework", html: [/\/_next\/|__NEXT_DATA__/] },
  { name: "Nuxt.js", category: "JS Framework", html: [/\/_nuxt\/|__NUXT__/] },
  { name: "React", category: "JS Framework", html: [/data-reactroot|react(?:\.production)?(?:\.min)?\.js/i] },
  { name: "Vue.js", category: "JS Framework", html: [/vue(?:\.min)?\.js|data-v-[0-9a-f]{8}/i] },
  { name: "Angular", category: "JS Framework", html: [/ng-version=|angular(?:\.min)?\.js/i] },
  { name: "Svelte", category: "JS Framework", html: [/svelte-[0-9a-z]{6}/i] },
  { name: "Gatsby", category: "JS Framework", html: [/\/page-data\/|___gatsby/i] },

  // ── Libraries / UI ──
  { name: "jQuery", category: "Library", html: [/jquery(?:-\d[\d.]*)?(?:\.min)?\.js/i] },
  { name: "Bootstrap", category: "Library", html: [/bootstrap(?:\.min)?\.(?:css|js)/i] },
  { name: "Font Awesome", category: "Library", html: [/font-?awesome/i] },

  // ── Analytics / Marketing ──
  { name: "Google Analytics", category: "Analytics", html: [/google-analytics\.com\/(analytics|ga)\.js|gtag\('config'|www\.googletagmanager\.com\/gtag/i] },
  { name: "Google Tag Manager", category: "Analytics", html: [/googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/] },
  { name: "Meta Pixel", category: "Marketing", html: [/connect\.facebook\.net\/[^"']+\/fbevents\.js|fbq\(/i] },
  { name: "Hotjar", category: "Analytics", html: [/static\.hotjar\.com|hjSiteSettings/i] },
  { name: "HubSpot", category: "Marketing", html: [/js\.hs-scripts\.com|js\.hsforms\.net/i] },
  { name: "Mailchimp", category: "Marketing", html: [/chimpstatic\.com|list-manage\.com/i] },
  { name: "Intercom", category: "Marketing", html: [/widget\.intercom\.io|intercomSettings/i] },

  // ── Payments ──
  { name: "Stripe", category: "Payments", html: [/js\.stripe\.com/i] },
  { name: "PayPal", category: "Payments", html: [/paypal\.com\/sdk\/js|paypalobjects\.com/i] },

  // ── Infrastructure (headers) ──
  { name: "Cloudflare", category: "CDN / Hosting", html: [/cdn-cgi\//i], headers: [{ key: "server", value: /cloudflare/i }, { key: "cf-ray" }] },
  { name: "Vercel", category: "CDN / Hosting", headers: [{ key: "server", value: /vercel/i }, { key: "x-vercel-id" }] },
  { name: "Netlify", category: "CDN / Hosting", headers: [{ key: "server", value: /netlify/i }, { key: "x-nf-request-id" }] },
  { name: "Nginx", category: "Web Server", headers: [{ key: "server", value: /nginx/i }] },
  { name: "Apache", category: "Web Server", headers: [{ key: "server", value: /apache/i }] },
  { name: "PHP", category: "Programming Language", headers: [{ key: "x-powered-by", value: /php/i }] },
  { name: "ASP.NET", category: "Programming Language", headers: [{ key: "x-powered-by", value: /asp\.net/i }, { key: "x-aspnet-version" }] },
  { name: "Express", category: "Web Framework", headers: [{ key: "x-powered-by", value: /express/i }] },
];

export function detectTech(html: string, headers: Record<string, string>): TechItem[] {
  const found: TechItem[] = [];
  for (const rule of RULES) {
    let hit = false;
    if (rule.html?.some((re) => re.test(html))) hit = true;
    if (!hit && rule.headers) {
      hit = rule.headers.some(({ key, value }) => {
        const hv = headers[key];
        if (hv === undefined) return false;
        return value ? value.test(hv) : true;
      });
    }
    if (hit) found.push({ name: rule.name, category: rule.category });
  }
  return found;
}
