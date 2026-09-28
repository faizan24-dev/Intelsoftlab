// Recipient list parsing — CSV, TSV, and pasted free text.
// XLSX goes through the parse API route, which uses exceljs server-side.

import type { Recipient } from "@/lib/bulk-mailer/types";

const EMAIL_RE =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** RFC 4180 CSV: quoted fields, escaped quotes, embedded newlines. */
export function parseDelimited(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Pick the delimiter by counting candidates in the first line. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const counts = [
    { delimiter: ",", n: (firstLine.match(/,/g) || []).length },
    { delimiter: "\t", n: (firstLine.match(/\t/g) || []).length },
    { delimiter: ";", n: (firstLine.match(/;/g) || []).length },
  ].sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].delimiter : ",";
}

export interface ParsedList {
  recipients: Recipient[];
  columns: string[];
  /** Rows dropped because they had no usable address. */
  invalid: { row: number; value: string }[];
  duplicates: number;
}

/** Which column holds the address? Prefer a header named "email". */
function findEmailColumn(header: string[], sample: string[][]): number {
  const byName = header.findIndex((h) => /^e-?mail(\s*address)?$/i.test(h.trim()));
  if (byName >= 0) return byName;
  const looksLikeEmail = header.findIndex((h) => /mail/i.test(h));
  if (looksLikeEmail >= 0) return looksLikeEmail;
  // No helpful header: use the column with the most valid addresses.
  let best = { index: -1, hits: 0 };
  const width = Math.max(...sample.map((r) => r.length), 0);
  for (let c = 0; c < width; c++) {
    const hits = sample.filter((r) => isEmail(r[c] || "")).length;
    if (hits > best.hits) best = { index: c, hits };
  }
  return best.index;
}

/** True when the first row looks like column names rather than data. */
function hasHeaderRow(rows: string[][]): boolean {
  if (rows.length < 2) return !rows[0]?.some((cell) => isEmail(cell));
  const first = rows[0];
  const firstHasEmail = first.some((cell) => isEmail(cell));
  const restHaveEmail = rows.slice(1, 6).some((r) => r.some((cell) => isEmail(cell)));
  return !firstHasEmail && restHaveEmail;
}

/** Parse a table (CSV/TSV text or already-split rows) into recipients. */
export function parseRows(rows: string[][]): ParsedList {
  const invalid: { row: number; value: string }[] = [];
  if (!rows.length) return { recipients: [], columns: [], invalid, duplicates: 0 };

  const header = hasHeaderRow(rows) ? rows[0].map((h) => h.trim()) : [];
  const body = header.length ? rows.slice(1) : rows;
  const emailIndex = findEmailColumn(header, body.slice(0, 50));

  if (emailIndex < 0) {
    body.forEach((r, i) => invalid.push({ row: i + 1, value: r.join(", ").slice(0, 80) }));
    return { recipients: [], columns: header, invalid, duplicates: 0 };
  }

  const columns = header.length
    ? header
    : Array.from({ length: Math.max(...body.map((r) => r.length)) }, (_, i) =>
        i === emailIndex ? "email" : `column_${i + 1}`,
      );

  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  let duplicates = 0;

  body.forEach((row, i) => {
    const email = (row[emailIndex] || "").trim().toLowerCase();
    if (!isEmail(email)) {
      if (row.some((c) => c.trim())) invalid.push({ row: i + 1, value: row.join(", ").slice(0, 80) });
      return;
    }
    if (seen.has(email)) {
      duplicates++;
      return;
    }
    seen.add(email);

    const fields: Record<string, string> = {};
    columns.forEach((name, c) => {
      if (c === emailIndex) return;
      const value = (row[c] || "").trim();
      if (name && value) fields[name] = value;
    });
    recipients.push({ email, fields });
  });

  return { recipients, columns, invalid, duplicates };
}

/** Parse CSV/TSV text, or a loose list of addresses pasted by hand. */
export function parseListText(text: string): ParsedList {
  const trimmed = text.trim();
  if (!trimmed) return { recipients: [], columns: [], invalid: [], duplicates: 0 };

  const delimiter = detectDelimiter(trimmed);
  const rows = parseDelimited(trimmed, delimiter);

  // A single column of bare addresses: treat every token as an address so that
  // "a@x.com, b@y.com" on one line works as well as one per line.
  const looksTabular = rows.some((r) => r.length > 1);
  if (!looksTabular) {
    const tokens = trimmed.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
    return parseRows(tokens.map((t) => [t]));
  }
  return parseRows(rows);
}
