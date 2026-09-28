// Manual check: node scripts/fake-smtp.cjs   (in one terminal)
//               npx tsx scripts/test-bulk-mailer.ts
// Exercises list parsing, merge-tag rendering, HTML escaping and a full
// campaign run against the local SMTP sink on 127.0.0.1:2525.
import { parseListText } from "@/lib/bulk-mailer/recipients";
import { render, findUnresolvedTags, htmlToText } from "@/lib/bulk-mailer/template";
import { startCampaign } from "@/lib/bulk-mailer/send";
import { getCampaign, toStatus } from "@/lib/bulk-mailer/store";

const csv = `email,name,company
ada@example.com,Ada,Analytical Engines
grace@example.com,Grace,Compiler Co
bounce@example.com,Bouncer,Nowhere Ltd
ada@example.com,Dupe,Ignored
not-an-email,Broken,Bad Row`;

const parsed = parseListText(csv);
console.log("parsed:", parsed.recipients.length, "recipients |", parsed.duplicates, "dupes |", parsed.invalid.length, "invalid");
console.log("columns:", parsed.columns);

const subject = "Hi {{name}} at {{company}}";
const html = "<p>Hello {{name|there}} from {{company}}!</p><p>Reach us at {{email}}. <a href='{{unsubscribe_url}}'>Unsubscribe</a></p><p>Risky: {{missing_tag}}</p>";
console.log("\nunresolved tags:", findUnresolvedTags([subject, html], parsed.recipients));
const ctx = { recipient: parsed.recipients[0], unsubscribeUrl: "https://x.test/u" };
console.log("rendered subject:", render(subject, ctx, false));
console.log("rendered html   :", render(html, ctx, true));
console.log("plain text      :", JSON.stringify(htmlToText(render(html, ctx, true))));

// HTML escaping check
const nasty = { recipient: { email: "x@y.com", fields: { name: "<script>alert(1)</script>", company: "Smith & Sons" } } };
console.log("escaped inject  :", render("<p>{{name}} — {{company}}</p>", nasty, true));

(async () => {
  const record = startCampaign({
    recipients: parsed.recipients,
    template: { subject, html },
    sender: { fromName: "Test Sender", fromEmail: "sender@test.local", unsubscribeUrl: "https://x.test/u" },
    smtp: { host: "127.0.0.1", port: 2525, secure: false, user: "", password: "" },
    throttle: { delaySeconds: 0.5, batchSize: 0, batchPauseSeconds: 0 },
  });
  console.log("\ncampaign:", record.id);
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const s = toStatus(getCampaign(record.id)!);
    if (["completed", "cancelled", "failed"].includes(s.state)) {
      console.log("state:", s.state, "| summary:", JSON.stringify(s.summary));
      if (s.error) console.log("error:", s.error);
      for (const d of [...s.log].reverse()) console.log(`  ${d.state.padEnd(8)} ${d.email.padEnd(22)} ${d.code ?? ""} ${(d.message||"").slice(0,60)}`);
      process.exit(0);
    }
  }
  console.log("timed out waiting for campaign");
  process.exit(1);
})();
