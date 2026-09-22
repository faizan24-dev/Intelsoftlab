"use client";

import { useState } from "react";
import Link from "next/link";
import { mainNav, siteConfig, tools } from "@/lib/site";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-ink">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-sm">
            🕷️
          </span>
          <span className="text-lg tracking-tight">{siteConfig.name}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-brand-50 hover:text-brand-700"
          >
            Home
          </Link>

          {/* Tools dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <Link
              href="/tools"
              className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-brand-50 hover:text-brand-700"
            >
              Tools
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </Link>
            {toolsOpen && (
              <div className="absolute left-0 top-full w-80 pt-2">
                <div className="grid gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {tools.slice(0, 5).map((t) => (
                    <Link
                      key={t.slug + t.name}
                      href={t.href}
                      className="flex items-start gap-3 rounded-lg p-2.5 transition hover:bg-brand-50"
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span>
                        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                          {t.name}
                          {t.status === "soon" && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                              Soon
                            </span>
                          )}
                        </span>
                        <span className="line-clamp-1 text-xs text-muted">{t.description}</span>
                      </span>
                    </Link>
                  ))}
                  <Link href="/services" className="mt-1 block rounded-lg bg-slate-50 p-2.5 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
                    View all tools & services →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {mainNav.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-brand-700"
          >
            Login
          </Link>
          <Link
            href="/tools/website-extractor"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Try Free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="grid h-10 w-10 place-items-center rounded-md text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-ink-soft"
              >
                Login
              </Link>
              <Link
                href="/tools/website-extractor"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Try Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
