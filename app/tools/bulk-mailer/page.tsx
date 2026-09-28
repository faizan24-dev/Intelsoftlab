import type { Metadata } from "next";
import BulkMailer from "@/components/tool/bulk-mailer/BulkMailer";

export const metadata: Metadata = {
  title: "Bulk Mailer",
  description:
    "Send personalized email campaigns to thousands of leads effortlessly — CSV/XLSX lists, merge tags, your own SMTP, throttling and live delivery tracking.",
};

const badges = [
  "📄 CSV / XLSX lists",
  "🏷️ Merge tags",
  "👁️ Live preview",
  "🔌 Your own SMTP",
  "🐢 Rate limiting",
  "📊 Live tracking",
];

export default function BulkMailerPage() {
  return (
    <div className="bg-slate-50">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-brand-600">Email Marketing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Bulk <span className="text-gradient">Mailer</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Send personalized email campaigns to thousands of leads effortlessly. Upload a list,
            compose once with merge tags, connect your own SMTP provider, and watch every delivery
            land in real time — with throttling that keeps your domain out of trouble.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tool */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <BulkMailer />
        <p className="mt-6 text-center text-xs text-muted">
          Sends through your own SMTP account, subject to that provider&apos;s limits · Credentials
          are never stored · Only mail people who opted in — a lawful basis and a working
          unsubscribe are required in most jurisdictions.
        </p>
      </section>
    </div>
  );
}
