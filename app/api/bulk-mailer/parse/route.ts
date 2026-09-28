// POST /api/bulk-mailer/parse — turn an uploaded CSV/XLSX into recipients.
// XLSX is parsed server-side with exceljs so the browser bundle stays small.

import ExcelJS from "exceljs";
import { parseListText, parseRows } from "@/lib/bulk-mailer/recipients";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected a multipart upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "That file is larger than the 8 MB limit." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) return Response.json({ error: "That workbook has no sheets." }, { status: 400 });

      const rows: string[][] = [];
      sheet.eachRow({ includeEmpty: false }, (row) => {
        const values: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          values.push(cellText(cell));
        });
        rows.push(values);
      });
      return Response.json({ parsed: parseRows(rows) });
    }

    // .csv / .tsv / .txt — and anything else we can read as text.
    const text = await file.text();
    return Response.json({ parsed: parseListText(text) });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? `Could not read that file: ${e.message}` : "Could not read that file." },
      { status: 400 },
    );
  }
}

/** Flatten a cell to text, including hyperlink and rich-text cells. */
function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as { text?: string; hyperlink?: string; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(v.richText)) return v.richText.map((p) => p.text).join("");
    if (typeof v.text === "string") return v.text;
    if (typeof v.hyperlink === "string") return v.hyperlink.replace(/^mailto:/i, "");
    if (v.result !== undefined) return String(v.result);
  }
  return String(cell.text ?? "");
}
