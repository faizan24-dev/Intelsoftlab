import Link from "next/link";
import HeroDemo from "@/components/marketing/HeroDemo";
import Newsletter from "@/components/marketing/Newsletter";
import { siteConfig, tools } from "@/lib/site";

const stats = [
  { n: "25,000+", l: "Companies served" },
  { n: "98%", l: "Customer satisfaction" },
  { n: "150%", l: "Avg. ROI increase" },
  { n: "24/7", l: "Support availability" },
];

const leadCategories = [
  { icon: "📧", title: "Email Marketing", desc: "Find and verify business emails, then reach them at scale." },
  { icon: "📱", title: "Social Media", desc: "Discover social profiles tied to any company or domain." },
  { icon: "💬", title: "WhatsApp & Telecalling", desc: "Collect phone numbers for direct outreach campaigns." },
  { icon: "🧩", title: "Technology-specific", desc: "Target companies by the tech stack they run." },
  { icon: "🎯", title: "Niche-focused", desc: "Build hyper-targeted lists for your exact audience." },
];

const features = [
  { icon: "🎨", title: "User-friendly design", desc: "Clean, intuitive tools your whole team can use on day one." },
  { icon: "📈", title: "Built to scale", desc: "From a single lookup to bulk lists of thousands of domains." },
  { icon: "🤝", title: "Real support", desc: "Responsive help whenever you hit a wall — 24/7." },
  { icon: "🔄", title: "Regular updates", desc: "New tools and improvements shipped continuously." },
];

const testimonials = [
  { quote: "Our lead pipeline doubled within a month of switching. The extractor alone paid for itself.", name: "Ava Thompson", role: "Head of Growth" },
  { quote: "Bulk mode saved my team days of manual copy-paste. Exports drop straight into our CRM.", name: "Daniel Osei", role: "Sales Operations" },
  { quote: "Clean data, fast crawls, and dead-simple exports. Exactly what we needed.", name: "Priya Nair", role: "Founder" },
];

export default function Home() {
  const featured = tools.filter((t) => t.status === "live").slice(0, 4);
  const showcase = featured.length >= 4 ? featured : tools.slice(0, 4);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white bg-grid">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
              🚀 Trusted by 25,000+ teams worldwide
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
              Ready to <span className="text-gradient">unlock your potential</span>?
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              {siteConfig.name} gives you a complete suite of lead-generation and data-extraction
              tools — find emails, phones, and social profiles from any website, then export
              everything in one click.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tools/website-extractor"
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Try the Website Extractor
              </Link>
              <Link
                href="/tools"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-ink-soft transition hover:bg-slate-50"
              >
                Browse all tools
              </Link>
            </div>
          </div>
          <div className="lg:pl-6">
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-slate-200 bg-brand-600">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-3xl font-extrabold text-white sm:text-4xl">{s.n}</div>
              <div className="mt-1 text-sm text-brand-100">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Lead categories ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Lead generation"
          title="Every kind of lead, one platform"
          subtitle="Reach prospects through the channels that convert best for your business."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {leadCategories.map((c) => (
            <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-6 transition hover:shadow-md">
              <div className="text-3xl">{c.icon}</div>
              <h3 className="mt-4 font-semibold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm text-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why teams choose us"
            title="Powerful, yet effortless"
            subtitle="Built for marketers and sales teams who value their time."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-50 text-2xl">{f.icon}</div>
                <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services showcase ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Our tools"
          title="A tool for every step of outreach"
          subtitle="Start with the flagship Website Extractor — more tools rolling out soon."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {showcase.map((t) => (
            <Link
              key={t.name}
              href={t.href}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
            >
              <div className="text-3xl">{t.icon}</div>
              <h3 className="mt-4 flex items-center gap-2 font-semibold text-ink">
                {t.name}
                {t.status === "soon" && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted">Soon</span>
                )}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted">{t.description}</p>
              <span className="mt-4 text-sm font-semibold text-brand-600 transition group-hover:translate-x-1">
                {t.status === "live" ? "Open tool →" : "Learn more →"}
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/tools" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View all tools →
          </Link>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Testimonials" title="Loved by growth teams" subtitle="" />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-xl bg-white p-6 shadow-sm">
                <div className="text-brand-500">★★★★★</div>
                <blockquote className="mt-3 flex-1 text-sm text-ink-soft">“{t.quote}”</blockquote>
                <figcaption className="mt-4">
                  <div className="font-semibold text-ink">{t.name}</div>
                  <div className="text-xs text-muted">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <Newsletter />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
    </div>
  );
}
