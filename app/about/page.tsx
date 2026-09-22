import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${siteConfig.name} and our mission to make lead generation effortless.`,
};

const values = [
  { icon: "🎯", title: "Outcome-obsessed", desc: "We measure success by the leads and revenue our tools generate for you." },
  { icon: "🔐", title: "Ethical by design", desc: "Polite crawling, robots.txt awareness, and sensible rate limits are built in." },
  { icon: "⚙️", title: "Engineer-grade", desc: "Fast, reliable extraction backed by a robust multi-page crawler." },
];

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-white bg-grid">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            We help teams find their <span className="text-gradient">next customers</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            {siteConfig.name} builds simple, powerful tools for lead generation and data extraction.
            Our flagship Website Extractor turns any website into a clean list of contacts — no
            spreadsheets-by-hand required.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="rounded-xl border border-slate-200 bg-white p-8">
              <div className="text-3xl">{v.icon}</div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{v.title}</h3>
              <p className="mt-2 text-sm text-muted">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-ink">Ready to see it in action?</h2>
          <p className="mt-2 text-muted">Run your first extraction free — no account needed.</p>
          <Link
            href="/tools/website-extractor"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Try the Website Extractor
          </Link>
        </div>
      </section>
    </div>
  );
}
