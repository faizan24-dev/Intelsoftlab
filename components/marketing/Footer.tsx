import Link from "next/link";
import { siteConfig, tools } from "@/lib/site";

export default function Footer() {
  const emailTools = tools.filter((t) => t.group === "Email Marketing");
  const utilTools = tools.filter((t) => t.group === "Utility Tools");

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-2 font-bold text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 text-white">
              🕷️
            </span>
            <span className="text-lg">{siteConfig.name}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted">{siteConfig.tagline}</p>
          <p className="mt-4 text-sm text-muted">
            {siteConfig.email}
            <br />
            {siteConfig.phone}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink">Email Marketing</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {emailTools.map((t) => (
              <li key={t.name}>
                <Link href={t.href} className="text-muted transition hover:text-brand-700">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink">Utility Tools</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {utilTools.map((t) => (
              <li key={t.name}>
                <Link href={t.href} className="text-muted transition hover:text-brand-700">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink">Company</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/about" className="text-muted transition hover:text-brand-700">About</Link></li>
            <li><Link href="/contact" className="text-muted transition hover:text-brand-700">Contact</Link></li>
            <li><Link href="/login" className="text-muted transition hover:text-brand-700">Login</Link></li>
            <li><Link href="/register" className="text-muted transition hover:text-brand-700">Register</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {siteConfig.name}. For ethical data collection only.</p>
          <p>Respects robots.txt · Polite crawl delays · Page caps</p>
        </div>
      </div>
    </footer>
  );
}
