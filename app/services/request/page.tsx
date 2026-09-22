import type { Metadata } from "next";
import RequestForm from "@/components/marketing/RequestForm";

export const metadata: Metadata = {
  title: "Request Custom Scraping",
  description: "Tell us the sites and fields you need — we'll scope it and deliver clean data.",
};

export default function RequestPage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Request <span className="text-gradient">custom scraping</span>
          </h1>
          <p className="mt-3 text-muted">
            For Google Maps, directories, real estate, lead lists, or any bespoke source — describe
            what you need and we&apos;ll get back to you with a scope and quote.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <RequestForm />
      </div>
    </div>
  );
}
