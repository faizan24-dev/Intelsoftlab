import type { Metadata } from "next";
import EmailFinder from "@/components/tool/email-finder/EmailFinder";

export const metadata: Metadata = {
  title: "Web Email Finder",
  description:
    "Instantly find the contact emails behind any website URL — homepage, contact, about and team pages, with CSV and JSON export.",
};

const badges = [
  "📧 Contact emails",
  "🔗 mailto + obfuscated",
  "🧭 Follows contact pages",
  "🧹 Junk filtered",
  "🏷️ Personal vs role",
  "📊 Confidence score",
  "📋 Copy & export",
  "🗂️ Bulk mode",
];

export default function WebEmailFinderPage() {
  return (
    <div className="bg-slate-50">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-brand-600">Email Marketing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Web Email <span className="text-gradient">Finder</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Instantly find contact emails behind any website URL. We scan the homepage, then follow
            the pages that actually carry addresses — contact, about, team, support and imprint —
            decode obfuscated addresses, filter out placeholders, and rank what&apos;s left by
            confidence. Single URL or bulk list, with CSV / JSON export.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tool */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <EmailFinder />
        <p className="mt-6 text-center text-xs text-muted">
          Only collects addresses a site publishes publicly · Built-in crawl delays · Max 15 pages
          per domain · For ethical outreach only — always honour opt-outs and local anti-spam law.
        </p>
      </section>
    </div>
  );
}
