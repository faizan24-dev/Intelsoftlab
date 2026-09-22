import type { Metadata } from "next";
import WebsiteExtractor from "@/components/tool/WebsiteExtractor";

export const metadata: Metadata = {
  title: "Website Extractor",
  description:
    "Crawl any website and extract emails, phone numbers, and social profiles — single URL or in bulk, with Excel/CSV/JSON export.",
};

const badges = [
  "📧 Email + Phone",
  "📍 Addresses",
  "🏢 Company data",
  "🔗 8 Social Platforms",
  "🧱 Tech detection",
  "🔎 SEO data",
  "🛍️ Products & Jobs",
  "🔤 Keyword search",
  "📊 Excel / CSV / JSON",
  "🗂️ Bulk mode",
];

export default function WebsiteExtractorPage() {
  return (
    <div className="bg-slate-50">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-brand-600">Utility Tools</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Website <span className="text-gradient">Extractor</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Production-grade website data extraction — pull emails, phones, addresses, social links,
            company details, SEO data, technology stack, products, jobs, and keyword matches from any
            site. Works on a single URL or a bulk list, with Excel / CSV / JSON export.
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
        <WebsiteExtractor />
        <p className="mt-6 text-center text-xs text-muted">
          Respects robots.txt · Built-in crawl delays · Max 25 pages per domain · For ethical data
          collection only.
        </p>
      </section>
    </div>
  );
}
