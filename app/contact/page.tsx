import type { Metadata } from "next";
import ContactForm from "@/components/marketing/ContactForm";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${siteConfig.name} team.`,
};

export default function ContactPage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Get in <span className="text-gradient">touch</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Questions, feedback, or partnership ideas? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-6 lg:col-span-1">
          <InfoBlock icon="✉️" title="Email" value={siteConfig.email} />
          <InfoBlock icon="📞" title="Phone" value={siteConfig.phone} />
          <InfoBlock icon="📍" title="Location" value={siteConfig.address} />
        </div>
        <div className="lg:col-span-2">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-xl">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="text-sm text-muted">{value}</div>
      </div>
    </div>
  );
}
