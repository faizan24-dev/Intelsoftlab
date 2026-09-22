"use client";

import { useMemo, useState } from "react";
import type { ScrapeResult, SocialPlatform } from "@/lib/types";
import { socialCount } from "@/lib/stats";
import BarChart from "@/components/tool/BarChart";
import {
  downloadExport,
  MetricCard,
  SectionTitle,
  SOCIAL_ICONS,
} from "@/components/tool/shared";

export default function ResultView({ result }: { result: ScrapeResult }) {
  const success = result.status === "success";

  // Tabs are built dynamically so rich sections only appear when there's data.
  const tabs = useMemo(() => {
    const t: string[] = ["Emails", "Phones", "Social"];
    if (result.addresses.length) t.push("Addresses");
    if (result.company) t.push("Company");
    if (result.seo) t.push("SEO");
    if (result.tech.length) t.push("Tech");
    if (result.products.length) t.push("Products");
    if (result.jobs.length) t.push("Jobs");
    if (result.keyword_hits.length) t.push("Keywords");
    t.push("Metadata", "Chart", "Logs", "Export");
    return t;
  }, [result]);

  const [tab, setTab] = useState<string>("Emails");
  const active = tabs.includes(tab) ? tab : "Emails";

  const kpis: [string | number, string][] = [
    [result.emails.length, "Emails"],
    [result.phones.length, "Phones"],
    [result.addresses.length, "Addresses"],
    [socialCount(result), "Social"],
    [result.tech.length, "Technologies"],
    [`${result.elapsed}s`, "Time"],
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            success
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-red-50 text-red-700 ring-1 ring-red-200"
          }`}
        >
          {success ? "✅ SUCCESS" : "❌ FAILED"}
        </span>
        <span className="truncate text-sm text-muted">{result.url}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(([value, label]) => (
          <MetricCard key={label} value={value} label={label} />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              active === t
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-muted hover:text-ink-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {active === "Emails" && <SimpleList title={`Emails (${result.emails.length} found)`} items={result.emails} empty="No emails found." accent="text-emerald-600" />}
        {active === "Phones" && <SimpleList title={`Phone Numbers (${result.phones.length} found)`} items={result.phones} empty="No phone numbers found." accent="text-amber-600" />}
        {active === "Addresses" && <SimpleList title={`Addresses (${result.addresses.length} found)`} items={result.addresses} empty="No addresses found." accent="text-ink-soft" />}
        {active === "Social" && <SocialTab result={result} />}
        {active === "Company" && <CompanyTab result={result} />}
        {active === "SEO" && <SeoTab result={result} />}
        {active === "Tech" && <TechTab result={result} />}
        {active === "Products" && <ProductsTab result={result} />}
        {active === "Jobs" && <JobsTab result={result} />}
        {active === "Keywords" && <KeywordsTab result={result} />}
        {active === "Metadata" && <MetadataTab result={result} />}
        {active === "Chart" && (
          <>
            <SectionTitle>Extraction Breakdown</SectionTitle>
            <BarChart
              data={[
                { label: "Emails", value: result.emails.length },
                { label: "Phones", value: result.phones.length },
                { label: "Addresses", value: result.addresses.length },
                ...Object.entries(result.social_links).filter(([, v]) => v.length).map(([k, v]) => ({ label: capitalize(k), value: v.length })),
              ]}
            />
          </>
        )}
        {active === "Logs" && (
          <>
            <SectionTitle>Crawl Log ({result.logs.length} entries)</SectionTitle>
            <div className="max-h-64 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-emerald-300">
              {result.logs.length ? result.logs.map((l, i) => <div key={i}>{l}</div>) : <span className="text-slate-500">No log entries.</span>}
            </div>
          </>
        )}
        {active === "Export" && <ExportTab result={result} />}
      </div>
    </div>
  );
}

function SimpleList({ title, items, empty, accent }: { title: string; items: string[]; empty: string; accent: string }) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      {items.length ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {items.map((it, i) => (
            <li key={i} className={`px-4 py-2 font-mono text-sm ${accent}`}>{it}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </>
  );
}

function SocialTab({ result }: { result: ScrapeResult }) {
  const entries = Object.entries(result.social_links).filter(([, links]) => links.length);
  return (
    <>
      <SectionTitle>Social Links ({socialCount(result)} found)</SectionTitle>
      {entries.length ? (
        <div className="space-y-4">
          {entries.map(([platform, links]) => (
            <div key={platform}>
              <p className="mb-2 text-sm font-semibold text-ink">
                {SOCIAL_ICONS[platform as SocialPlatform]} {capitalize(platform)} ({links.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {links.map((l) => (
                  <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="break-all rounded-full bg-brand-50 px-3 py-1 font-mono text-xs text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100">
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No social profile links detected.</p>
      )}
    </>
  );
}

function CompanyTab({ result }: { result: ScrapeResult }) {
  const c = result.company;
  if (!c) return <p className="text-sm text-muted">No company data found.</p>;
  const rows: [string, string | undefined][] = [
    ["Name", c.name],
    ["Legal name", c.legalName],
    ["Website", c.url],
    ["Email", c.email],
    ["Phone", c.telephone],
    ["Address", c.address],
    ["Description", c.description],
  ];
  return (
    <>
      <SectionTitle>Company (from structured data)</SectionTitle>
      <KeyValueTable rows={rows.filter(([, v]) => v) as [string, string][]} />
      {c.sameAs?.length ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-ink">Profiles</p>
          <div className="flex flex-wrap gap-2">
            {c.sameAs.map((l) => (
              <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="break-all rounded-full bg-brand-50 px-3 py-1 font-mono text-xs text-brand-700 ring-1 ring-brand-100">
                {l}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function SeoTab({ result }: { result: ScrapeResult }) {
  const s = result.seo!;
  const rows: [string, string | number][] = [
    ["Title", `${s.title} (${s.titleLength} chars)`],
    ["Meta description", s.metaDescription ? `${s.metaDescription} (${s.metaDescriptionLength})` : "—"],
    ["Meta keywords", s.metaKeywords || "—"],
    ["Canonical", s.canonical || "—"],
    ["Robots", s.robots || "—"],
    ["Language", s.lang || "—"],
    ["Viewport tag", s.viewport ? "✓ present" : "✗ missing"],
    ["Word count", s.wordCount],
    ["Images", `${s.imageCount} (${s.imagesMissingAlt} missing alt)`],
    ["Internal / external links", `${s.internalLinks} / ${s.externalLinks}`],
  ];
  return (
    <>
      <SectionTitle>SEO — Homepage</SectionTitle>
      <KeyValueTable rows={rows as [string, string][]} />
      {s.h1.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold text-ink">H1 ({s.h1.length})</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{s.h1.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </div>
      )}
      {s.h2.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold text-ink">H2 ({s.h2.length})</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{s.h2.slice(0, 12).map((h, i) => <li key={i}>{h}</li>)}</ul>
        </div>
      )}
    </>
  );
}

function TechTab({ result }: { result: ScrapeResult }) {
  const byCat = result.tech.reduce<Record<string, string[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t.name);
    return acc;
  }, {});
  return (
    <>
      <SectionTitle>Technology Stack ({result.tech.length} detected)</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(byCat).map(([cat, names]) => (
          <div key={cat} className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{cat}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {names.map((n) => (
                <span key={n} className="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-ink-soft">{n}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ProductsTab({ result }: { result: ScrapeResult }) {
  return (
    <>
      <SectionTitle>Products ({result.products.length})</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Name</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Brand</th><th className="px-3 py-2">Availability</th>
            </tr>
          </thead>
          <tbody>
            {result.products.map((p, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-ink">{p.name}</td>
                <td className="px-3 py-2">{p.price ? `${p.price} ${p.currency || ""}`.trim() : "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.sku || "—"}</td>
                <td className="px-3 py-2">{p.brand || "—"}</td>
                <td className="px-3 py-2">{p.availability || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function JobsTab({ result }: { result: ScrapeResult }) {
  return (
    <>
      <SectionTitle>Job Listings ({result.jobs.length})</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Title</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Posted</th>
            </tr>
          </thead>
          <tbody>
            {result.jobs.map((j, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-ink">{j.title}</td>
                <td className="px-3 py-2">{j.company || "—"}</td>
                <td className="px-3 py-2">{j.location || "—"}</td>
                <td className="px-3 py-2">{j.employmentType || "—"}</td>
                <td className="px-3 py-2">{j.datePosted?.slice(0, 10) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function KeywordsTab({ result }: { result: ScrapeResult }) {
  return (
    <>
      <SectionTitle>Keyword Matches</SectionTitle>
      <div className="space-y-3">
        {result.keyword_hits.map((k) => (
          <div key={k.keyword} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{k.keyword}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${k.count > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-muted"}`}>
                {k.count} match{k.count === 1 ? "" : "es"} · {k.pages} page{k.pages === 1 ? "" : "s"}
              </span>
            </div>
            {k.sample && <p className="mt-2 text-sm text-muted">{k.sample}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

function MetadataTab({ result }: { result: ScrapeResult }) {
  const rows: [string, string][] = [
    ["Domain", result.domain || "—"],
    ["Title", result.metadata?.title || "—"],
    ["Description", result.metadata?.description || "—"],
    ["Status", result.status || "—"],
  ];
  return (
    <>
      <SectionTitle>Page Metadata</SectionTitle>
      <KeyValueTable rows={rows} />
      {result.pages_crawled.length > 0 && (
        <div className="mt-6">
          <SectionTitle>Pages Crawled ({result.pages_crawled.length})</SectionTitle>
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {result.pages_crawled.map((p, i) => <li key={i} className="px-4 py-1.5 font-mono text-xs text-brand-700">{p}</li>)}
          </ul>
        </div>
      )}
      {result.errors.length > 0 && (
        <div className="mt-6">
          <SectionTitle>Errors ({result.errors.length})</SectionTitle>
          <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-red-100">
            {result.errors.map((e, i) => <li key={i} className="px-4 py-1.5 font-mono text-xs text-red-600">{e}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}

function ExportTab({ result }: { result: ScrapeResult }) {
  return (
    <>
      <SectionTitle>Download Results</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => downloadExport("xlsx", "single", { result })} className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md">📥 Download Excel (.xlsx)</button>
        <button onClick={() => downloadExport("json", "single", { result })} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink-soft transition hover:bg-slate-50">⬇️ Download JSON</button>
        <button onClick={() => downloadExport("csv", "single", { result })} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink-soft transition hover:bg-slate-50">⬇️ Download CSV</button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Excel includes sheets for Emails, Phones, Social, Addresses, Technologies, SEO, Products, and Jobs where data exists.
      </p>
    </>
  );
}

function KeyValueTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-slate-100 last:border-0">
            <td className="w-44 bg-slate-50 px-4 py-2 align-top font-medium text-ink-soft">{k}</td>
            <td className="break-words px-4 py-2 text-muted">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
