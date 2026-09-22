import type { Metadata } from "next";
import Link from "next/link";
import { serviceCategories, services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Features & Services",
  description:
    "The full range of data-extraction features — self-serve tools plus done-for-you managed services.",
};

export default function ServicesPage() {
  const liveCount = services.filter((s) => s.delivery === "self-serve").length;

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white bg-grid">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Features &amp; <span className="text-gradient">Services</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            Everything we extract, in one place. {liveCount} features run instantly in our live
            Website Extractor; the rest are done-for-you engagements our team delivers to spec.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 ring-1 ring-emerald-200">
              ● Live tool — use it now
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700 ring-1 ring-brand-100">
              ● Managed service — request a quote
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        {serviceCategories.map((cat) => (
          <div key={cat}>
            <h2 className="mb-6 text-xl font-bold text-ink">{cat}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services
                .filter((s) => s.category === cat)
                .map((s) => {
                  const live = s.delivery === "self-serve";
                  return (
                    <Link
                      key={s.n}
                      href={s.href}
                      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted">#{s.n}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            live ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"
                          }`}
                        >
                          {live ? "Live tool" : "Managed"}
                        </span>
                      </div>
                      <h3 className="mt-3 font-semibold text-ink">{s.name}</h3>
                      <p className="mt-2 flex-1 text-sm text-muted">{s.description}</p>
                      <span className="mt-4 text-sm font-semibold text-brand-600 transition group-hover:translate-x-1">
                        {live ? "Open in extractor →" : "Request a quote →"}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <section className="bg-brand-700">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white">Need something custom?</h2>
          <p className="mt-2 text-brand-100">
            Tell us the sites and exact fields you need — we&apos;ll scope it and deliver clean data.
          </p>
          <Link
            href="/services/request"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Request custom scraping
          </Link>
        </div>
      </section>
    </div>
  );
}
