"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Stub: no email backend wired. Swap for a real POST /api/contact when available.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        ✅ Thanks for reaching out! This is a demo form, so nothing was actually sent — wire it up to
        your inbox or CRM when you&apos;re ready.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" placeholder="Jane Doe" />
        <Field label="Email" name="email" type="email" placeholder="jane@company.com" />
      </div>
      <Field label="Subject" name="subject" placeholder="How can we help?" />
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-soft">Message</label>
        <textarea
          required
          rows={5}
          placeholder="Tell us about your use case…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Send message
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
      <input
        required
        name={name}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}
