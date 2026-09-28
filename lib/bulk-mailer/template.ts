// Merge-tag rendering: {{name}} → the recipient's "name" column.
//
// Values are HTML-escaped when rendering the body, because a list column can
// contain anything ("Smith & Sons <Ltd>") and a campaign must not be able to
// break — or inject into — its own markup.

import type { Recipient } from "@/lib/bulk-mailer/types";

/** {{ tag }} with optional |fallback: {{first_name|there}} */
const TAG_RE = /\{\{\s*([a-zA-Z0-9_. -]+?)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Every distinct tag used in a template, in first-seen order. */
export function extractTags(...templates: string[]): string[] {
  const seen = new Set<string>();
  for (const template of templates) {
    for (const m of (template || "").matchAll(TAG_RE)) {
      seen.add(m[1].trim().toLowerCase());
    }
  }
  return [...seen];
}

/** Column names a recipient list offers, plus the always-available ones. */
export function availableTags(recipients: Recipient[]): string[] {
  const tags = new Set<string>(["email"]);
  for (const r of recipients.slice(0, 200)) {
    for (const key of Object.keys(r.fields)) tags.add(key.toLowerCase());
  }
  return [...tags];
}

export interface RenderContext {
  recipient: Recipient;
  unsubscribeUrl?: string;
}

function lookup(tag: string, ctx: RenderContext): string | undefined {
  const key = tag.trim().toLowerCase();
  if (key === "email") return ctx.recipient.email;
  if (key === "unsubscribe_url" || key === "unsubscribe") return ctx.unsubscribeUrl;
  // Column names are matched case-insensitively and space/underscore agnostic.
  const normalized = key.replace(/[\s-]+/g, "_");
  for (const [field, value] of Object.entries(ctx.recipient.fields)) {
    const candidate = field.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (candidate === normalized) return value;
  }
  return undefined;
}

/**
 * Replace every tag. `escape` is on for HTML bodies and off for the subject
 * line, which is plain text.
 */
export function render(template: string, ctx: RenderContext, escape: boolean): string {
  return (template || "").replace(TAG_RE, (_match, rawTag: string, fallback?: string) => {
    const value = lookup(rawTag, ctx) ?? fallback ?? "";
    return escape ? escapeHtml(value) : value;
  });
}

/** Tags used in the template that no recipient column can fill. */
export function findUnresolvedTags(templates: string[], recipients: Recipient[]): string[] {
  const known = new Set([...availableTags(recipients), "unsubscribe_url", "unsubscribe"]);
  const normalize = (t: string) => t.replace(/[\s-]+/g, "_");
  const knownNormalized = new Set([...known].map(normalize));
  return extractTags(...templates).filter((tag) => {
    // A tag with a |fallback always resolves to something.
    return !knownNormalized.has(normalize(tag));
  });
}

/** Strip tags from HTML for the plain-text alternative part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
