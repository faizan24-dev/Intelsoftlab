"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    // Stub: no email backend wired. Swap for a real POST when available.
    setDone(true);
  }

  return (
    <section className="bg-gradient-to-br from-brand-700 to-brand-900">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Stay ahead of your competition</h2>
        <p className="mt-3 text-brand-100">
          Get product updates, lead-gen tactics, and exclusive offers in your inbox.
        </p>
        {done ? (
          <p className="mt-6 rounded-lg bg-white/10 px-4 py-3 text-white">
            ✅ Thanks! You&apos;re on the list. (Demo only — no email is actually stored.)
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-lg px-4 py-3 text-sm text-ink outline-none"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
