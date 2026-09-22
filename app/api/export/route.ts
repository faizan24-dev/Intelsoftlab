// POST /api/export  { format, mode, result?, results? }  → downloadable file.

import { toExcelSingle, toExcelBulk } from "@/lib/export/excel";
import { toCsv, toBulkCsv } from "@/lib/export/csv";
import { toJson, toBulkJson } from "@/lib/export/json";
import type { ScrapeResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExportFormat = "xlsx" | "csv" | "json";
type ExportMode = "single" | "bulk";

interface ExportBody {
  format: ExportFormat;
  mode: ExportMode;
  result?: ScrapeResult;
  results?: ScrapeResult[];
  filename?: string;
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function POST(req: Request) {
  let body: ExportBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { format, mode, result, results, filename } = body;
  const isBulk = mode === "bulk";

  if (isBulk && !Array.isArray(results)) {
    return Response.json({ error: "`results` array required for bulk" }, { status: 400 });
  }
  if (!isBulk && !result) {
    return Response.json({ error: "`result` required for single" }, { status: 400 });
  }

  const baseName =
    filename || (isBulk ? "webscrapex_bulk" : (result?.domain || "export"));

  try {
    if (format === "xlsx") {
      const buf = isBulk
        ? await toExcelBulk(results!)
        : await toExcelSingle(result!);
      return fileResponse(buf, `${baseName}.xlsx`, XLSX_MIME);
    }
    if (format === "csv") {
      const text = isBulk ? toBulkCsv(results!) : toCsv(result!);
      return fileResponse(text, `${baseName}.csv`, "text/csv; charset=utf-8");
    }
    if (format === "json") {
      const text = isBulk ? toBulkJson(results!) : toJson(result!);
      return fileResponse(text, `${baseName}.json`, "application/json; charset=utf-8");
    }
    return Response.json({ error: "Unknown format" }, { status: 400 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

function fileResponse(data: Buffer | string, filename: string, mime: string): Response {
  const body = typeof data === "string" ? data : new Uint8Array(data);
  return new Response(body, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
