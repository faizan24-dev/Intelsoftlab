import type { Metadata } from "next";
import EmailVerifier from "@/components/tool/email-verifier/EmailVerifier";

export const metadata: Metadata = {
  title: "Real Email Verifier",
  description:
    "Check whether an email address really exists — format, MX records, mailbox type and a live SMTP handshake, with a confidence score.",
};

const badges = [
  "✅ Format check",
  "🌐 MX / DNS lookup",
  "📮 SMTP handshake",
  "🗑️ Disposable detection",
  "👥 Role-based detection",
  "🎯 Confidence score",
];

export default function RealEmailVerifierPage() {
  return (
    <div className="bg-slate-50">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-brand-600">Email Marketing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Real Email <span className="text-gradient">Verifier</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            Check whether an address can actually receive mail before you send to it. We validate
            the format, look up the domain&apos;s mail servers, identify webmail, disposable and
            role-based mailboxes, then open a real SMTP handshake — without ever sending an email.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
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
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <EmailVerifier />
        <p className="mt-6 text-center text-xs text-muted">
          No email is ever sent — the check stops before the DATA command. Some mail servers accept
          every address or block verification probes, and those results are reported as
          &ldquo;catch-all&rdquo; or &ldquo;unknown&rdquo; rather than guessed.
        </p>
      </section>
    </div>
  );
}
