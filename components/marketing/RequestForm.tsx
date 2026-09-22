"use client";

import { useState } from "react";

const DATA_TYPES = [
  "Emails",
  "Phone numbers",
  "Addresses",
  "Company data",
  "Products / pricing",
  "Job listings",
  "Real estate",
  "Directory listings",
  "Google Maps",
  "Other",
];

export default function RequestForm() {
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  function toggle(t: string) {
    setSelected((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        ✅ Thanks — your request has been captured. This is a demo form (nothing was sent), so wire it
        to your inbox or CRM when you&apos;re ready to take live requests.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" placeholder="Jane Doe" />
        <Field label="Work email" type="email" placeholder="jane@company.com" />
      </div>
      <Field label="Company (optional)" required={false} placeholder="Acme Inc." />

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-soft">Target websites / sources</label>
        <textarea
          required
          rows={4}
          placeholder={"One per line, e.g.\nhttps://directory.com/category\nhttps://competitor.com"}
          className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-ink-soft">What data do you need?</span>
        <div className="flex flex-wrap gap-2">
          {DATA_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => toggle(t)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selected.includes(t)
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-300 text-ink-soft hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">Approx. volume</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
            <option>Under 1,000 records</option>
            <option>1,000 – 10,000</option>
            <option>10,000 – 100,000</option>
            <option>100,000+</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">Frequency</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
            <option>One-time</option>
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Ongoing / API</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-soft">Project details</label>
        <textarea
          rows={4}
          placeholder="Exact fields, format, deadlines, and anything else we should know…"
          className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <button type="submit" className="w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
        Submit request
      </button>
      <p className="text-center text-xs text-muted">
        We only collect publicly available data and follow site terms & applicable laws.
      </p>
    </form>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  required = true,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}
