// Manual check: npx tsx scripts/test-email-finder.ts [url ...]
// Asserts the junk filter, then runs the finder against any URLs given.
import { findEmails } from "@/lib/email-finder";
import { isUsableEmail, classifyEmail } from "@/lib/email-finder/classify";

const junk = [
  "logo@2x.png", "sprite@3x.webp", "user@domain.com", "domain@example.com",
  "you@yourdomain.com", "name@email.com", "test@test.com", "john.doe@example.org",
  "a1b2c3d4e5f6a7b8@sentry.io", "1234567890@wixpress.com", "icon@2x.jpg",
  "style@main.css", "123@456.789",
];
const good = [
  "support@rankkw.com", "john.smith@acme-corp.io", "info@company.co.uk",
  "sales.uk@vendor.com", "j.doe@firm.de",
];
let bad = 0;
for (const e of junk) { const ok = isUsableEmail(e); if (ok) bad++; console.log(`${ok ? "LEAK" : "ok  "}  reject ${e}`); }
for (const e of good) { const ok = isUsableEmail(e); if (!ok) bad++; console.log(`${ok ? "ok  " : "LOST"}  accept ${e} → ${classifyEmail(e)}`); }
console.log(bad === 0 ? "\nFILTER OK\n" : `\n${bad} FILTER PROBLEM(S)\n`);

(async () => {
  for (const url of process.argv.slice(2)) {
    const r = await findEmails(url, { maxPages: 6 });
    console.log(`=== ${url}  [${r.status}] ${r.elapsed}s  pages=${r.pagesScanned.length}`);
    if (r.error) console.log("   error:", r.error);
    for (const e of r.emails) {
      console.log(`   ${e.email.padEnd(34)} ${e.kind.padEnd(9)} ${e.confidence.padEnd(7)} ${String(e.score).padStart(3)}  ${e.viaMailto ? "mailto" : "text  "}  ${e.sources[0]}`);
    }
    if (!r.emails.length && r.status === "success") console.log("   (none found)");
  }
})();
