"use client";

import { useState } from "react";
import Link from "next/link";

// NOTE: Visual stub only. No authentication, storage, or submission is wired up.
// The original project had no accounts or database; this exists for layout parity.

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [notice, setNotice] = useState(false);
  const isLogin = mode === "login";

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">{isLogin ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted">
        {isLogin ? "Log in to continue." : "Start finding leads in minutes."}
      </p>

      <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
        Demo interface — accounts aren&apos;t enabled yet. The Website Extractor works without signing in.
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setNotice(true);
        }}
        className="mt-6 space-y-4"
      >
        {!isLogin && (
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Full name</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="Jane Doe" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">Email</label>
          <input type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="you@company.com" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">Password</label>
          <input type="password" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="••••••••" />
        </div>

        {notice && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-muted">
            Authentication isn&apos;t implemented in this demo build.
          </p>
        )}

        <button type="submit" className="w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
          {isLogin ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {isLogin ? (
          <>Don&apos;t have an account? <Link href="/register" className="font-semibold text-brand-600">Register</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="font-semibold text-brand-600">Log in</Link></>
        )}
      </p>
    </div>
  );
}
