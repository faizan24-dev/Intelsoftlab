"use client";

// Results grid: one row per domain, with per-column filters, paging and export.

import { useMemo, useState } from "react";
import type { EmailFindResult } from "@/lib/email-finder/types";
import { emailsToCsv, emailsToJson, exportBaseName } from "@/lib/email-finder/export";
import SocialIcon, { socialLabel } from "@/components/tool/email-finder/SocialIcon";

const DASH = "—";
const PAGE_SIZES = [10, 25, 50, 100];

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** mm:ss, the way the run timer reads. */
function formatExec(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function shortPath(url: string): string {
  try {
    const u = new URL(url);
    return (u.pathname.replace(/\/+$/, "") || "/") + u.search;
  } catch {
    return url;
  }
}

interface Row {
  key: string;
  result: EmailFindResult;
  domain: string;
  businessName: string;
  email: string;
  extraEmails: number;
  allEmails: string;
  phone: string;
  contactForm: string;
  address: string;
  socialText: string;
  category: string;
  technology: string;
  status: "SUCCESS" | "FAILED";
}

type TextColumn =
  | "domain"
  | "businessName"
  | "allEmails"
  | "phone"
  | "contactForm"
  | "address"
  | "socialText"
  | "technology";

export default function EmailResults({
  results,
  execSeconds,
}: {
  results: EmailFindResult[];
  execSeconds: number;
}) {
  const [filters, setFilters] = useState<Record<TextColumn, string>>({
    domain: "",
    businessName: "",
    allEmails: "",
    phone: "",
    contactForm: "",
    address: "",
    socialText: "",
    technology: "",
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);

  const rows: Row[] = useMemo(
    () =>
      results.map((r, i) => ({
        key: `${r.url}-${i}`,
        result: r,
        domain: r.domain,
        businessName: r.businessName,
        email: r.emails[0]?.email ?? "",
        extraEmails: Math.max(0, r.emails.length - 1),
        allEmails: r.emails.map((e) => e.email).join(" "),
        phone: r.phone,
        contactForm: r.contactFormUrl,
        address: r.address,
        socialText: r.social.map((s) => socialLabel(s.platform)).join(" "),
        category: r.category,
        technology: r.technologies.join(", "),
        status: r.status === "success" ? "SUCCESS" : "FAILED",
      })),
    [results],
  );

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter((c) => c && c !== DASH))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const matches = (value: string, term: string) =>
      !term.trim() || value.toLowerCase().includes(term.trim().toLowerCase());
    return rows.filter(
      (r) =>
        (Object.keys(filters) as TextColumn[]).every((col) => matches(r[col], filters[col])) &&
        (categoryFilter === "all" || r.category === categoryFilter) &&
        (statusFilter === "all" || r.status === statusFilter),
    );
  }, [rows, filters, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages - 1);
  const start = current * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const completed = results.filter((r) => r.status === "success").length;
  const setFilter = (col: TextColumn, value: string) => {
    setFilters((f) => ({ ...f, [col]: value }));
    setPage(0);
  };

  const base = exportBaseName(results);
  const exportRows = filtered.map((r) => r.result);

  return (
    <div className="mt-8">
      {/* Run summary + export */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-t-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Completed
          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700">
            {completed}/{results.length}
          </span>
        </span>

        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <svg className="h-4 w-4 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.3.7l2.5 2.5a1 1 0 101.4-1.4L11 9.58z"
              clipRule="evenodd"
            />
          </svg>
          Exec Time: <span className="font-bold text-brand-600">{formatExec(execSeconds)}</span>
        </span>

        <span className="text-sm text-muted">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
          {filtered.length !== rows.length && ` of ${rows.length}`}
        </span>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => download(emailsToCsv(exportRows), `${base}.csv`, "text/csv;charset=utf-8")}
            disabled={!filtered.length}
            className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => download(emailsToJson(exportRows), `${base}.json`, "application/json")}
            disabled={!filtered.length}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto border-x border-slate-200">
        <table className="w-full min-w-[1500px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-[13px] font-semibold text-ink">
              {[
                "Domain",
                "Business Name",
                "Email Address",
                "Phone No",
                "Contact Form",
                "Address",
                "Social Profiles",
                "Web Category",
                "Web Technology",
                "Status",
              ].map((h) => (
                <th key={h} className="border-b border-slate-200 px-3 py-2.5 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
            <tr className="bg-white">
              <FilterCell value={filters.domain} onChange={(v) => setFilter("domain", v)} />
              <FilterCell value={filters.businessName} onChange={(v) => setFilter("businessName", v)} />
              <FilterCell value={filters.allEmails} onChange={(v) => setFilter("allEmails", v)} />
              <FilterCell value={filters.phone} onChange={(v) => setFilter("phone", v)} />
              <FilterCell value={filters.contactForm} onChange={(v) => setFilter("contactForm", v)} />
              <FilterCell value={filters.address} onChange={(v) => setFilter("address", v)} />
              <FilterCell value={filters.socialText} onChange={(v) => setFilter("socialText", v)} />
              <SelectCell
                value={categoryFilter}
                onChange={(v) => {
                  setCategoryFilter(v);
                  setPage(0);
                }}
                options={categories}
              />
              <FilterCell value={filters.technology} onChange={(v) => setFilter("technology", v)} />
              <SelectCell
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(0);
                }}
                options={["SUCCESS", "FAILED"]}
              />
            </tr>
          </thead>

          <tbody>
            {visible.map((row) => (
              <tr key={row.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                {/* Domain */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <FaviconTile domain={row.domain} />
                    <span className="font-medium text-ink">{row.domain}</span>
                    <a
                      href={row.result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted transition hover:text-brand-700"
                      aria-label={`Open ${row.domain}`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 3h6v6M17 3l-8 8M15 12v5H3V5h5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </span>
                </td>

                <td className="max-w-[14rem] truncate px-3 py-3 text-ink-soft" title={row.businessName}>
                  {row.businessName || DASH}
                </td>

                {/* Email */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {row.email ? (
                    <span className="flex items-center gap-2">
                      <a href={`mailto:${row.email}`} className="text-ink hover:text-brand-700">
                        {row.email}
                      </a>
                      {row.extraEmails > 0 && (
                        <span
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-muted"
                          title={row.result.emails.map((e) => e.email).join("\n")}
                        >
                          +{row.extraEmails}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted">{DASH}</span>
                  )}
                </td>

                <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{row.phone || DASH}</td>

                {/* Contact form */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {row.contactForm ? (
                    <a
                      href={row.contactForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:underline"
                      title={row.contactForm}
                    >
                      {shortPath(row.contactForm)}
                    </a>
                  ) : (
                    <span className="text-muted">{DASH}</span>
                  )}
                </td>

                <td className="max-w-[20rem] truncate px-3 py-3 text-ink-soft" title={row.address}>
                  {row.address || DASH}
                </td>

                {/* Social */}
                <td className="px-3 py-3">
                  {row.result.social.length ? (
                    <span className="flex items-center gap-1.5">
                      {row.result.social.map((s) => (
                        <SocialIcon key={s.platform} platform={s.platform} url={s.url} />
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted">{DASH}</span>
                  )}
                </td>

                <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{row.category || DASH}</td>

                <td className="max-w-[16rem] truncate px-3 py-3 text-ink-soft" title={row.technology}>
                  {row.technology || DASH}
                </td>

                {/* Status */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    title={row.result.error || undefined}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        row.status === "SUCCESS" ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <span className={row.status === "SUCCESS" ? "text-emerald-700" : "text-red-700"}>
                      {row.status}
                    </span>
                  </span>
                </td>
              </tr>
            ))}

            {!visible.length && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted">
                  {rows.length
                    ? "No rows match the current filters."
                    : "No results yet — run a search to populate the grid."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-3 rounded-b-xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink-soft">
        <label className="flex items-center gap-2">
          <span className="text-muted">Page Size:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <span className="tabular-nums">
          {filtered.length === 0 ? 0 : start + 1} to {Math.min(start + pageSize, filtered.length)} of{" "}
          {filtered.length}
        </span>

        <span className="flex items-center gap-1">
          <PagerButton label="First page" disabled={current === 0} onClick={() => setPage(0)} glyph="«" />
          <PagerButton
            label="Previous page"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            glyph="‹"
          />
          <span className="px-2 tabular-nums">
            Page {current + 1} of {totalPages}
          </span>
          <PagerButton
            label="Next page"
            disabled={current >= totalPages - 1}
            onClick={() => setPage(current + 1)}
            glyph="›"
          />
          <PagerButton
            label="Last page"
            disabled={current >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
            glyph="»"
          />
        </span>
      </div>

      {/* Failures spelled out — a red dot alone does not say what went wrong. */}
      {results.some((r) => r.status === "fail") && (
        <ul className="mt-4 space-y-2">
          {results
            .filter((r) => r.status === "fail")
            .map((r) => (
              <li
                key={r.url}
                className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200"
              >
                <span className="font-semibold">{r.domain}</span> — {r.error}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function FilterCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <td className="border-b border-slate-200 px-3 py-2">
      <span className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Filter column"
          className="w-full min-w-[7rem] rounded-md border border-slate-300 px-2 py-1 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <FilterGlyph active={Boolean(value.trim())} />
      </span>
    </td>
  );
}

function SelectCell({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <td className="border-b border-slate-200 px-3 py-2">
      <span className="flex items-center gap-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Filter column"
          className="w-full min-w-[7rem] rounded-md border border-slate-300 px-2 py-1 text-sm outline-none transition focus:border-brand-500"
        >
          <option value="all">All</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <FilterGlyph active={value !== "all"} />
      </span>
    </td>
  );
}

function FilterGlyph({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${active ? "text-brand-600" : "text-slate-300"}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm2.5 4h9a1 1 0 010 2h-9a1 1 0 010-2zM8 13h4a1 1 0 010 2H8a1 1 0 010-2z" />
    </svg>
  );
}

function PagerButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-muted transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-muted"
    >
      {glyph}
    </button>
  );
}

/** Favicon with a lettered fallback, so the cell never shows a broken image. */
function FaviconTile({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !domain) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-50 text-[10px] font-bold text-brand-700">
        {(domain || "?").replace(/^www\./, "").charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={20}
      height={20}
      className="h-5 w-5 shrink-0 rounded"
      onError={() => setFailed(true)}
    />
  );
}
