"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav, siteConfig, tools, toolGroups, type ToolGroup, type ToolItem } from "@/lib/site";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<ToolGroup | null>(null);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Click outside / Escape closes an open dropdown.
  useEffect(() => {
    if (!openGroup) return;
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup]);

  const groupHasActive = (group: ToolGroup) =>
    tools.some((t) => t.group === group && t.href !== "#" && pathname.startsWith(t.href));

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <nav
        ref={navRef}
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-ink">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-sm">
            🕷️
          </span>
          <span className="text-lg tracking-tight">{siteConfig.name}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          <NavLink href="/" active={pathname === "/"}>
            Home
          </NavLink>

          {toolGroups.map((group) => (
            // Click to toggle, not hover: hover-open and click-toggle fight each
            // other — the click would close a menu hover had just opened.
            <div key={group} className="relative">
              <button
                type="button"
                onClick={() => setOpenGroup((g) => (g === group ? null : group))}
                aria-expanded={openGroup === group}
                aria-haspopup="true"
                className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                  openGroup === group || groupHasActive(group)
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-soft hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {group}
                <svg
                  className={`h-4 w-4 transition-transform ${openGroup === group ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {openGroup === group && (
                <div className="absolute left-0 top-full w-80 pt-2">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {tools
                      .filter((t) => t.group === group)
                      .map((tool) => (
                        <ToolRow
                          key={tool.slug}
                          tool={tool}
                          active={isActive(pathname, tool)}
                          onNavigate={() => setOpenGroup(null)}
                        />
                      ))}
                    <Link
                      href="/tools"
                      onClick={() => setOpenGroup(null)}
                      className="mt-1 block rounded-lg bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                    >
                      View all tools →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}

          {mainNav.slice(1).map((item) => (
            <NavLink key={item.href} href={item.href} active={pathname.startsWith(item.href)}>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right actions */}
        <div className="hidden items-center gap-2 lg:flex">
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
          className="grid h-10 w-10 place-items-center rounded-md text-ink lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50"
            >
              Home
            </Link>

            {toolGroups.map((group) => (
              <details key={group} className="rounded-md" open={groupHasActive(group)}>
                <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-brand-50">
                  {group}
                </summary>
                <div className="mt-1 space-y-0.5 pl-2">
                  {tools
                    .filter((t) => t.group === group)
                    .map((tool) => (
                      <ToolRow
                        key={tool.slug}
                        tool={tool}
                        active={isActive(pathname, tool)}
                        onNavigate={() => setMobileOpen(false)}
                        compact
                      />
                    ))}
                </div>
              </details>
            ))}

            {mainNav.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50"
              >
                {item.label}
              </Link>
            ))}

            <div className="flex gap-2 pt-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-ink-soft"
              >
                Login
              </Link>
              <Link
                href="/tools/website-extractor"
                onClick={() => setMobileOpen(false)}
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

function isActive(pathname: string, tool: ToolItem): boolean {
  return tool.href !== "#" && pathname === tool.href;
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-brand-50 hover:text-brand-700"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * One dropdown row. A tool that is not built yet is rendered as plain text
 * with a "Soon" pill — never as a link to "#", which looks clickable and
 * does nothing.
 */
function ToolRow({
  tool,
  active,
  onNavigate,
  compact,
}: {
  tool: ToolItem;
  active: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const label = (
    <>
      <span className={compact ? "text-sm" : "text-base"} aria-hidden>
        {tool.icon}
      </span>
      <span className="flex-1 truncate">{tool.name}</span>
      <Badge tool={tool} />
    </>
  );

  const shared = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition`;

  if (tool.status !== "live") {
    return (
      <span className={`${shared} cursor-default text-muted`} title={tool.description}>
        {label}
      </span>
    );
  }

  return (
    <Link
      href={tool.href}
      onClick={onNavigate}
      title={tool.description}
      className={`${shared} ${
        active ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-brand-50 hover:text-brand-700"
      }`}
    >
      {label}
    </Link>
  );
}

function Badge({ tool }: { tool: ToolItem }) {
  if (tool.status !== "live") {
    return (
      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
        Soon
      </span>
    );
  }
  if (tool.badge === "new") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
        New
      </span>
    );
  }
  if (tool.badge === "pro") {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-amber-500"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-label="Flagship tool"
      >
        <path d="M5 19h14a1 1 0 010 2H5a1 1 0 010-2zM3.4 7.3a1.2 1.2 0 011.85-1.02L8.6 8.4l2.4-4.1a1.2 1.2 0 012.07 0l2.4 4.1 3.35-2.12A1.2 1.2 0 0120.6 7.3l-1.7 8.2a1 1 0 01-.98.8H6.08a1 1 0 01-.98-.8z" />
      </svg>
    );
  }
  return null;
}
