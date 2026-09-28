"use client";

import { useState } from "react";
import StepRecipients from "@/components/tool/bulk-mailer/StepRecipients";
import StepCompose from "@/components/tool/bulk-mailer/StepCompose";
import StepSmtp from "@/components/tool/bulk-mailer/StepSmtp";
import StepSend from "@/components/tool/bulk-mailer/StepSend";
import { DEFAULT_DRAFT, STEPS, type CampaignDraft } from "@/components/tool/bulk-mailer/types";

export default function BulkMailer() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CampaignDraft>(DEFAULT_DRAFT);

  const update = (patch: Partial<CampaignDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {/* Stepper */}
      <ol className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((s) => {
          const active = s.n === step;
          const done = s.n < step;
          return (
            <li key={s.n} className="flex-1 min-w-[9rem]">
              <button
                onClick={() => setStep(s.n)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      active
                        ? "bg-brand-600 text-white"
                        : done
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-muted"
                    }`}
                  >
                    {done ? "✓" : s.n}
                  </span>
                  <span
                    className={`truncate text-sm font-semibold ${
                      active ? "text-brand-700" : "text-ink-soft"
                    }`}
                  >
                    {s.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Current step */}
      {step === 1 && <StepRecipients draft={draft} update={update} />}
      {step === 2 && <StepCompose draft={draft} update={update} />}
      {step === 3 && <StepSmtp draft={draft} update={update} />}
      {step === 4 && <StepSend draft={draft} />}

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-40"
        >
          ← Back
        </button>
        <span className="text-xs text-muted">
          Step {step} of {STEPS.length}
        </span>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
          disabled={step === STEPS.length}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
