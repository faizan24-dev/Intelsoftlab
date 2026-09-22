// Manual parser check: npx tsx scripts/test-parsers.ts
// Fixture covers the junk that used to leak into the Phones and Addresses tabs.
import { extractPhones, parsePhone } from "@/lib/scraper/phone";
import { extractAddresses } from "@/lib/scraper/address";
import { extractStructured } from "@/lib/scraper/rich";

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
};

// ── 1. Unit-level phone validation ───────────────────────────────────────────
const shouldReject = [
  "0.300000000000000",
  "0.449999999999999",
  "1.694.625.712",
  "192.168.1.100",
  "10.0.0.1",
  "1.2.3.4",
  "1694625712",
  "1699999999999",
  "16946257121234",
  "0.5",
  "2024-01-15",
  "15-01-2024",
  "2023-2024",
  "978-0-306-40615-7",
  "1234567890",
  "0000000000",
  "1111111111",
  "300000000000000",
  "123456789012345",
  "98765432",
  "0.300000",
  "84-4023862", // EIN
  "1 707 000", // thousands-separated count
  "2 117 000",
];
for (const raw of shouldReject) {
  const r = parsePhone(raw);
  check(`reject ${raw}`, r === null, r ? `got "${r.display}"` : "");
}

const shouldAccept: [string, string][] = [
  ["+92 300 1234567", "+92 300 1234567"],
  ["+1 (555) 123-4567", "+1 (555) 123-4567"],
  ["(555) 123-4567", "(555) 123-4567"],
  ["555-123-4567", "555-123-4567"],
  ["555.123.4567", "555-123-4567"],
  ["+44 20 7123 4567", "+44 20 7123 4567"],
  ["021-111-123-456", "021-111-123-456"],
  ["03001234567", "03001234567"],
  ["+92-51-2345678", "+92-51-2345678"],
  ["(021) 34567890", "(021) 34567890"],
  ["+1 800 555 1234 ext 42", "+1 800 555 1234 ext. 42"],
];
for (const [raw, want] of shouldAccept) {
  const r = parsePhone(raw);
  check(`accept ${raw}`, r?.display === want, `got ${r ? `"${r.display}"` : "null"} want "${want}"`);
}

// ── 2. Page-level extraction ─────────────────────────────────────────────────
const html = `<!doctype html><html><head>
<script>
  var opacity = 0.300000000000000, delay = 0.449999999999999;
  var ts = 1694625712; var formatted = "1.694.625.712";
  var build = "1.694.625.712"; var ip = "192.168.1.100";
</script>
<style>.a{transform:translateX(0.300000000000000px);width:1024.5px;margin:0 0 0.4499999px}</style>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Organization","name":"Acme Traders",
 "telephone":"+92 21 34567890",
 "address":{"@type":"PostalAddress","streetAddress":"Plot 12, Block 7, Clifton",
   "addressLocality":"Karachi","addressRegion":"Sindh","postalCode":"75600","addressCountry":"PK"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","publisher":{"@type":"Organization",
 "address":{"@type":"PostalAddress","addressCountry":"PK"}}}
</script>
</head><body>
<main>
  <p>Version 1.694.625.712 &middot; uptime 99.9% &middot; only $1,200.00 today</p>
  <p>Order id 8893214455 &middot; SKU 9780306406157</p>
  <p>Call us: <a href="tel:+923001234567">+92 300 1234567</a> or 021-111-123-456</p>
  <p>Toll free 1-800-555-1234, fax 555.123.4567</p>
  <p>Weight 1200 kg, width 1920 px, rating 4.5/5</p>
</main>
<footer>
  <div class="footer-address">
    Head Office:<br>123 Main Street, Suite 100<br>Springfield, IL 62704<br>United States
  </div>
  <div class="location" itemscope itemtype="https://schema.org/PostalAddress">
    <span itemprop="streetAddress">45 Queen's Road, Gulberg III</span>,
    <span itemprop="addressLocality">Lahore</span>,
    <span itemprop="addressRegion">Punjab</span>
    <span itemprop="postalCode">54000</span>
    <meta itemprop="addressCountry" content="PK">
  </div>
  <address>Office 4, 2nd Floor, Al Habib Tower, F-8 Markaz, Islamabad, Pakistan</address>
  <p>PK</p>
  <p>&copy; 2024 Acme Traders. All rights reserved.</p>
</footer>
</body></html>`;

const phones = extractPhones(html);
console.log("\nphones:", phones);
const junk = phones.filter((p) =>
  /^0-|^1-694|192-168|^8893214455$|^1694625712$|^9780306406157$|1200|1920|^0-3|^0-4/.test(p),
);
check("no junk numbers in page phones", junk.length === 0, junk.join(" | "));
check("tel: link kept", phones.some((p) => p.replace(/\D/g, "") === "923001234567"));
check("JSON-LD phone kept", phones.some((p) => p.replace(/\D/g, "") === "922134567890"));
check("toll free kept", phones.some((p) => p.replace(/\D/g, "") === "18005551234"));
check("dotted fax normalized", phones.includes("555-123-4567"));

const addresses = extractAddresses(html);
console.log("\naddresses:", addresses);
check("no bare country code", !addresses.some((a) => /^(PK|US|Pakistan|United States)$/i.test(a.trim())));
check(
  "US street address present",
  addresses.some((a) => /123 Main Street.*Springfield/i.test(a)),
  addresses.join(" | "),
);
check(
  "microdata address assembled with country name",
  addresses.some((a) => /Queen's Road.*Lahore.*Pakistan/i.test(a)),
);
check(
  "<address> tag content present",
  addresses.some((a) => /Al Habib Tower.*Islamabad/i.test(a)),
);

const structured = extractStructured(html, "https://example.com");
console.log("\nstructured.addresses:", structured.addresses);
console.log("structured.company:", structured.company);
check("JSON-LD country-only dropped", !structured.addresses.some((a) => isCountryish(a)));
check(
  "JSON-LD address expanded",
  structured.addresses.some((a) => /Plot 12.*Karachi.*Sindh.*75600 Pakistan/i.test(a)),
  structured.addresses.join(" | "),
);
check("company telephone normalized", structured.company?.telephone === "+92 21 34567890");

// -- 3. Numberless + line-split addresses (regressions from live sites) ------
const noNumberHtml = `<!doctype html><html><body>
<section>
  <p>Office</p>
  <p>Bahawalpur, Pakistan</p>
  <p>Message us on WhatsApp for a quick reply - tap to open a chat with a greeting ready to send.</p>
  <p>Leaving Dol Beauty Salone, College Road, Bahawalpur, Punjab, Pakistan.</p>
</section>
<nav><p>Learn, Blog, How the ASF Works, The Apache Way</p></nav>
</body></html>`;

const noNumber = extractAddresses(noNumberHtml);
console.log("\nnumberless addresses:", noNumber);
check(
  "address without a house number is kept",
  noNumber.includes("Leaving Dol Beauty Salone, College Road, Bahawalpur, Punjab, Pakistan"),
  noNumber.join(" | "),
);
check("nav copy with a street word is not an address", !noNumber.some((a) => /Apache Way/.test(a)));
check("marketing copy is not glued onto an address", !noNumber.some((a) => /WhatsApp/.test(a)));
check("label + city + country alone is not an address", !noNumber.includes("Office, Bahawalpur, Pakistan"));

// One address split over several inline spans must come back as a single entry.
const splitHtml = `<!doctype html><html><body><p>Give</p><p>World Wide Web Consortium, Inc.</p>
<p><span>401 Edgewater Place, Suite 600</span><span>Wakefield</span><span>, MA 01880</span><span>USA</span></p>
</body></html>`;
const split = extractAddresses(splitHtml);
console.log("split-line addresses:", split);
check(
  "line-split address is joined",
  split.includes("401 Edgewater Place, Suite 600, Wakefield, MA 01880, USA"),
  split.join(" | "),
);
check("no half-address left over", split.length === 1, split.join(" | "));

function isCountryish(a: string) {
  return /^(PK|Pakistan)$/i.test(a.trim());
}

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
