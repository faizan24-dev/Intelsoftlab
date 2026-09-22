import type { Metadata } from "next";
import Link from "next/link";
import { tools } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tools",
  description: "The full suite of lead-generation and data-extraction tools.",
};

export default function ToolsPage() {
  const groups = ["Email Marketing", "Utility Tools"] as const;

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            All <span className="text-gradient">Tools</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            Everything you need to find, verify, and reach your next customers. The Website Extractor is
            live now — the rest are on the way.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        {groups.map((group) => (
          <div key={group}>
            <h2 className="mb-6 text-xl font-bold text-ink">{group}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tools
                .filter((t) => t.group === group)
                .map((t) => (
                  <Link
                    key={t.name}
                    href={t.href}
                    className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{t.icon}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          t.status === "live"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-muted"
                        }`}
                      >
                        {t.status === "live" ? "Live" : "Soon"}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold text-ink">{t.name}</h3>
                    <p className="mt-2 flex-1 text-sm text-muted">{t.description}</p>
                    <span className="mt-4 text-sm font-semibold text-brand-600 transition group-hover:translate-x-1">
                      {t.status === "live" ? "Open tool →" : "Coming soon →"}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
