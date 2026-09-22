// Manual engine check: npx tsx scripts/test-scrape.ts <url>
import { scrape } from "@/lib/scraper";
import { socialCount } from "@/lib/stats";

const target = process.argv[2] || "https://example.com";

(async () => {
  console.log(`Scraping ${target} ...`);
  const res = await scrape(target, (pct, msg) => {
    process.stdout.write(`\r[${pct}%] ${msg}                    `);
  });
  console.log("\n\n=== RESULT ===");
  console.log("domain:      ", res.domain);
  console.log("status:      ", res.status);
  console.log("elapsed:     ", res.elapsed, "s");
  console.log("pages:       ", res.pages_crawled.length);
  console.log("emails:      ", res.emails);
  console.log("phones:      ", res.phones);
  console.log("social count:", socialCount(res));
  console.log("social:      ", res.social_links);
  console.log("title:       ", res.metadata?.title);
  console.log("addresses:   ", res.addresses);
  console.log("tech:        ", res.tech.map((t) => `${t.name} (${t.category})`));
  console.log("company:     ", res.company);
  console.log("products:    ", res.products.length, "jobs:", res.jobs.length);
  console.log("seo.h1:      ", res.seo?.h1);
  console.log("seo.words:   ", res.seo?.wordCount, "int/ext links:", res.seo?.internalLinks, "/", res.seo?.externalLinks);
  console.log("errors:      ", res.errors.length);
})();
