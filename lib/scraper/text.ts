// Visible-text helpers shared by the phone and address extractors.
//
// Scanning raw HTML for numbers is what made the phone list fill up with JS
// floats, timestamps and CSS values — every regex pass now runs over rendered
// text only, with <script>/<style>/comments removed first.

import * as cheerio from "cheerio";

// Nodes whose text is never visible copy — or is code, which is worse than
// invisible: it is full of number-shaped noise.
const NOISE_SELECTOR =
  "script, style, noscript, template, svg, iframe, canvas, code, pre, option";

// Closing tags that imply a visual line break, so text on either side never
// fuses into one token ("Street 5Islamabad").
const BLOCK_CLOSE_RE =
  /<\/(?:p|div|li|ul|ol|td|th|tr|table|h[1-6]|section|article|header|footer|nav|address|span|a|label|strong|b|em|i|small|dd|dt|dl|figcaption|blockquote|main|aside|form)\s*>/gi;

const SELF_BREAK_RE = /<(?:br|hr)\s*\/?>/gi;

/** Strip HTML comments (conditional comments hide plenty of junk markup). */
export function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, " ");
}

/**
 * Load a document with non-visible / code nodes removed and block boundaries
 * turned into newlines, so `.text()` on any element yields readable lines.
 */
export function loadVisible(html: string): cheerio.CheerioAPI {
  const marked = stripComments(html)
    .replace(SELF_BREAK_RE, "\n")
    .replace(BLOCK_CLOSE_RE, "$&\n");
  const $ = cheerio.load(marked);
  $(NOISE_SELECTOR).remove();
  return $;
}

/** Collapse runs of spaces/tabs, keep single newlines as block separators. */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\u00A0\u2007\u202F\u2009]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Non-empty, trimmed lines of a block of rendered text. */
export function textLines(text: string): string[] {
  return normalizeWhitespace(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Rendered text of the page: no scripts, styles, comments or code blocks, with
 * block boundaries preserved as newlines.
 */
export function visibleText(html: string): string {
  const $ = loadVisible(html);
  const body = $("body");
  return normalizeWhitespace(body.length ? body.text() : $.root().text());
}
