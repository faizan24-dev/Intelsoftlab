"use client";

import { useMemo, useRef, useState } from "react";
import { availableTags, findUnresolvedTags, render } from "@/lib/bulk-mailer/template";
import type { CampaignDraft } from "@/components/tool/bulk-mailer/types";

interface Props {
  draft: CampaignDraft;
  update: (patch: Partial<CampaignDraft>) => void;
}

export default function StepCompose({ draft, update }: Props) {
  const [showPreview, setShowPreview] = useState(true);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [lastFocused, setLastFocused] = useState<"subject" | "body">("body");

  const tags = useMemo(() => {
    const fromList = availableTags(draft.recipients);
    return [...new Set([...fromList, "unsubscribe_url"])];
  }, [draft.recipients]);

  const unresolved = useMemo(
    () => findUnresolvedTags([draft.subject, draft.html], draft.recipients),
    [draft.subject, draft.html, draft.recipients],
  );

  /** Insert at the caret of whichever field the user last touched. */
  function insertTag(tag: string) {
    const token = `{{${tag}}}`;
    if (lastFocused === "subject") {
      const el = subjectRef.current;
      if (!el) return;
      const start = el.selectionStart ?? draft.subject.length;
      const end = el.selectionEnd ?? start;
      const next = draft.subject.slice(0, start) + token + draft.subject.slice(end);
      update({ subject: next });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
      return;
    }
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? draft.html.length;
    const end = el.selectionEnd ?? start;
    const next = draft.html.slice(0, start) + token + draft.html.slice(end);
    update({ html: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  // Preview against the first real recipient, or a sample row.
  const sample = draft.recipients[0] ?? {
    email: "ada@example.com",
    fields: { name: "Ada", company: "Analytical Engines" },
  };
  const ctx = { recipient: sample, unsubscribeUrl: draft.sender.unsubscribeUrl };
  const previewSubject = render(draft.subject, ctx, false);
  const previewHtml = render(draft.html, ctx, true);

  return (
    <div className="space-y-5">
      {/* Merge tags */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Merge tags</p>
        <p className="mt-1 text-xs text-muted">
          Click to insert at the cursor. Add a fallback with a pipe:{" "}
          <code className="rounded bg-white px-1 py-0.5 text-[11px] text-ink-soft">
            {"{{name|there}}"}
          </code>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => insertTag(tag)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-ink-soft transition hover:border-brand-400 hover:text-brand-700"
            >
              {`{{${tag}}}`}
            </button>
          ))}
          {draft.recipients.length === 0 && (
            <span className="text-xs text-muted">
              Upload a list in step 1 to see its columns here.
            </span>
          )}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="text-sm font-semibold text-ink">
          Subject line
        </label>
        <input
          id="subject"
          ref={subjectRef}
          value={draft.subject}
          onChange={(e) => update({ subject: e.target.value })}
          onFocus={() => setLastFocused("subject")}
          placeholder="Quick question about {{company}}"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* Body + preview */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="body" className="text-sm font-semibold text-ink">
            Email body (HTML)
          </label>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
        </div>

        <div className={`mt-2 grid gap-4 ${showPreview ? "lg:grid-cols-2" : ""}`}>
          <textarea
            id="body"
            ref={bodyRef}
            value={draft.html}
            onChange={(e) => update({ html: e.target.value })}
            onFocus={() => setLastFocused("body")}
            rows={14}
            spellCheck={false}
            className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 font-mono text-[13px] leading-relaxed outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          {showPreview && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  Preview · {sample.email}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                  {previewSubject || <span className="text-muted">(no subject)</span>}
                </p>
              </div>
              {/* Sandboxed: the preview renders the author's own HTML with no
                  scripts and no access to this page. */}
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={`<!doctype html><meta charset="utf-8"><body style="margin:0;padding:16px;font:14px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">${previewHtml}</body>`}
                className="h-[320px] w-full bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {unresolved.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          These tags have no matching column and will render empty:{" "}
          <span className="font-mono">{unresolved.map((t) => `{{${t}}}`).join(", ")}</span>. Add a
          fallback like <span className="font-mono">{"{{name|there}}"}</span> to be safe.
        </p>
      )}
    </div>
  );
}
