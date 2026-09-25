// Manual check: npx tsx scripts/test-email-verifier.ts <email> [email ...]
// Runs the full pipeline (syntax -> MX -> lists -> SMTP) and prints each step.
import { verifyEmail } from "@/lib/email-verifier";
(async () => {
  for (const email of process.argv.slice(2)) {
    const r = await verifyEmail(email);
    console.log(`\n=== ${email}`);
    console.log(`  verdict=${r.verdict} score=${r.score} initials=${r.initials} (${r.elapsedMs}ms)`);
    console.log(`  mx=${r.mx.found ? r.mx.hosts.slice(0,2).join(",") : "none"}  smtp=${r.smtp.outcome}${r.smtp.code ? " ("+r.smtp.code+")" : ""}`);
    if (r.format.suggestion) console.log(`  suggestion: ${r.format.suggestion}`);
    for (const c of r.checks) console.log(`   • ${c.label.padEnd(14)} ${c.status.padEnd(12)} [${c.state}] ${c.detail.slice(0, 70)}`);
  }
})();
