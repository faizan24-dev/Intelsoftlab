# IntelSoftLab — Next.js

A SoftTechLab-style lead-generation site with a fully working **Website Extractor** tool, converted
from the original Python/Streamlit **WebScrapeX** app. Everything runs on a single Next.js + TypeScript
stack — the scraping engine was rewritten from Python (`requests` + BeautifulSoup) to Node
(`fetch` + `cheerio`), and Excel export from `openpyxl` to `exceljs`.

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

```bash
npm run build   # production build
npm run start   # run the production build
```

## What's included

**Marketing site** (softtechlab.com-style)
- `/` — homepage: hero with a live email-finder demo, stats, lead categories, features, tool showcase, testimonials, newsletter
- `/tools` — full tool catalog
- `/about`, `/contact` — company pages (contact form is a stub — no email backend wired)
- `/login`, `/register` — **visual stubs only** (no authentication or database; the original had none)

**The tool** — `/tools/website-extractor`
- Single-URL and Bulk (up to 100 URLs) modes
- Extracts, from any site's own markup (accurate — nothing is guessed):
  - Emails (incl. obfuscated) & phone numbers
  - Postal addresses (`<address>` tags, schema.org, street regex)
  - 8 social platforms
  - Company data (schema.org Organization)
  - SEO data (title, meta, headings, canonical, OG/Twitter tags, link & image counts, word count)
  - Technology stack (CMS, frameworks, analytics, servers — signature-based, ~40 signatures)
  - Products & job listings (schema.org Product / JobPosting)
  - Keyword search (counts + context across crawled pages)
- Live progress + crawl logs (streamed from the API)
- Excel (multi-sheet) / CSV / JSON export, auto-deduplicated

**Features & Services** — `/services`
- All 19 features in one catalog, each tagged **Live tool** (runs in the extractor) or
  **Managed service** (done-for-you via `/services/request`)
- The managed items (Google Maps, real estate, directories, lead gen, competitor research, guest-post
  prospecting, custom) route to a request/intake form — honest framing, no fabricated data

## Architecture

```
app/
  page.tsx, about/, contact/, tools/, login/, register/   # pages
  tools/website-extractor/page.tsx                        # the tool
  api/scrape/route.ts        POST {url}    → NDJSON stream (progress + result)
  api/scrape/bulk/route.ts   POST {urls[]} → NDJSON stream (per-URL events)
  api/export/route.ts        POST {...}    → xlsx | csv | json download
lib/
  scraper/   patterns · url · fetch · extract · index   (the engine)
  export/    excel · csv · json
  validation.ts · stats.ts · types.ts · site.ts · stream-client.ts
components/
  marketing/ Navbar · Footer · HeroDemo · Newsletter · ContactForm · AuthForm
  tool/      WebsiteExtractor · SingleMode · BulkMode · ResultView · BarChart · shared
```

## Rebranding

Edit `lib/site.ts` — `siteConfig` (name, tagline, email, phone) and the `tools` catalog drive the
navbar, footer, homepage, and tool pages.

## Notes & limits

- **Long crawls / serverless:** a full crawl (up to 25 pages × depth 2 with polite delays) can take
  many seconds. Route handlers set `maxDuration`; on strict serverless tiers you may need to lower the
  caps in `lib/scraper/patterns.ts` or host on a long-running Node server.
- **No database:** results are per-request only, exactly like the original. Add a DB if you want saved
  history or accounts.
- **Ethics:** robots.txt is checked, requests use polite random delays, and crawling is capped per
  domain. For ethical data collection only.

## Engine parity test

```bash
npx tsx scripts/test-scrape.ts https://example.com
```

Prints emails/phones/social/metadata for a URL — handy for comparing against the original Python output.
