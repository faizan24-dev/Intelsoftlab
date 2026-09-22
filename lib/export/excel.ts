// Excel export — ported from utils.py to_excel_single()/to_excel_bulk().
// Reproduces the dark-themed multi-sheet workbooks using exceljs.

import ExcelJS from "exceljs";
import type { ScrapeResult, SocialPlatform } from "@/lib/types";
import { socialCount } from "@/lib/stats";

type Cell = ExcelJS.Cell;
const argb = (hex: string) => "FF" + hex.toUpperCase();

const thinBorder: ExcelJS.Borders = {
  top: { style: "thin", color: { argb: argb("2d3748") } },
  left: { style: "thin", color: { argb: argb("2d3748") } },
  bottom: { style: "thin", color: { argb: argb("2d3748") } },
  right: { style: "thin", color: { argb: argb("2d3748") } },
} as ExcelJS.Borders;

function headerStyle(cell: Cell, bg = "1a1a2e", fg = "00d4ff") {
  cell.font = { bold: true, color: { argb: argb(fg) }, name: "Arial", size: 10 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(bg) } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = thinBorder;
}

function dataStyle(cell: Cell, rowIdx: number) {
  const bg = rowIdx % 2 === 0 ? "0f172a" : "111827";
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(bg) } };
  cell.font = { name: "Arial", size: 9, color: { argb: argb("e2e8f0") } };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border = thinBorder;
}

function accentCell(cell: Cell, value: string | number, color = "10b981") {
  cell.value = value;
  cell.font = { bold: true, name: "Arial", size: 9, color: { argb: argb(color) } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("0f172a") } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = thinBorder;
}

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  linkedin: "0a66c2",
  facebook: "1877f2",
  instagram: "e1306c",
  twitter: "1da1f2",
  tiktok: "ff0050",
  youtube: "ff0000",
  pinterest: "e60023",
  whatsapp: "25d366",
};

function nowUtc(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

// ── Single result ────────────────────────────────────────────────────────────
export async function toExcelSingle(result: ScrapeResult): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const meta = result.metadata || {};

  // Sheet 1: Summary
  const wsSum = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  wsSum.getColumn(1).width = 22;
  wsSum.getColumn(2).width = 58;
  wsSum.mergeCells("A1:B1");
  const titleCell = wsSum.getCell("A1");
  titleCell.value = "🕷️ WebScrapeX — Extraction Report";
  titleCell.font = { bold: true, size: 14, color: { argb: argb("00d4ff") }, name: "Arial" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("0a0e1a") } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  wsSum.getRow(1).height = 36;

  const rows: [string, string | number][] = [
    ["Domain", result.domain || "—"],
    ["URL", result.url || "—"],
    ["Title", meta.title || "—"],
    ["Description", meta.description || "—"],
    ["Status", (result.status || "—").toUpperCase()],
    ["Emails Found", result.emails.length],
    ["Phones Found", result.phones.length],
    ["Social Links", socialCount(result)],
    ["Pages Crawled", result.pages_crawled.length],
    ["Errors", result.errors.length],
    ["Time (sec)", result.elapsed],
    ["Exported At", nowUtc()],
  ];
  rows.forEach(([label, value], i) => {
    const r = i + 2;
    const a = wsSum.getCell(r, 1);
    const b = wsSum.getCell(r, 2);
    a.value = label;
    b.value = value;
    dataStyle(a, r);
    dataStyle(b, r);
    a.font = { bold: true, name: "Arial", size: 9, color: { argb: argb("94a3b8") } };
    wsSum.getRow(r).height = 18;
  });

  // Sheet 2: Emails
  const wsEm = wb.addWorksheet("Emails", { views: [{ showGridLines: false }] });
  wsEm.getColumn(1).width = 6;
  wsEm.getColumn(2).width = 42;
  wsEm.getColumn(3).width = 28;
  ["#", "Email Address", "Domain"].forEach((h, i) => headerStyle(setCell(wsEm, 1, i + 1, h)));
  wsEm.getRow(1).height = 22;
  result.emails.forEach((email, idx) => {
    const r = idx + 2;
    const domainPart = email.includes("@") ? email.split("@").pop()! : "";
    accentCell(wsEm.getCell(r, 1), r - 1, "64748b");
    const c = setCell(wsEm, r, 2, email);
    dataStyle(c, r);
    c.font = { name: "Arial", size: 9, color: { argb: argb("34d399") } };
    dataStyle(setCell(wsEm, r, 3, domainPart), r);
    wsEm.getRow(r).height = 16;
  });

  // Sheet 3: Phones
  const wsPh = wb.addWorksheet("Phones", { views: [{ showGridLines: false }] });
  wsPh.getColumn(1).width = 6;
  wsPh.getColumn(2).width = 35;
  ["#", "Phone Number"].forEach((h, i) => headerStyle(setCell(wsPh, 1, i + 1, h)));
  wsPh.getRow(1).height = 22;
  result.phones.forEach((phone, idx) => {
    const r = idx + 2;
    accentCell(wsPh.getCell(r, 1), r - 1, "64748b");
    const c = setCell(wsPh, r, 2, phone);
    dataStyle(c, r);
    c.font = { name: "Arial", size: 9, color: { argb: argb("fbbf24") } };
    wsPh.getRow(r).height = 16;
  });

  // Sheet 4: Social Links
  const wsSl = wb.addWorksheet("Social Links", { views: [{ showGridLines: false }] });
  wsSl.getColumn(1).width = 14;
  wsSl.getColumn(2).width = 65;
  ["Platform", "Profile URL"].forEach((h, i) => headerStyle(setCell(wsSl, 1, i + 1, h)));
  wsSl.getRow(1).height = 22;
  let slRow = 2;
  for (const [platform, links] of Object.entries(result.social_links)) {
    for (const link of links) {
      const c1 = setCell(wsSl, slRow, 1, capitalize(platform));
      const c2 = setCell(wsSl, slRow, 2, link);
      dataStyle(c1, slRow);
      dataStyle(c2, slRow);
      const color = PLATFORM_COLORS[platform as SocialPlatform] || "a78bfa";
      c1.font = { bold: true, name: "Arial", size: 9, color: { argb: argb(color) } };
      c2.font = { name: "Arial", size: 9, color: { argb: argb("a78bfa") } };
      wsSl.getRow(slRow).height = 16;
      slRow++;
    }
  }

  // Sheet 5: Pages Crawled
  const wsPg = wb.addWorksheet("Pages Crawled", { views: [{ showGridLines: false }] });
  wsPg.getColumn(1).width = 6;
  wsPg.getColumn(2).width = 75;
  ["#", "Page URL"].forEach((h, i) => headerStyle(setCell(wsPg, 1, i + 1, h)));
  wsPg.getRow(1).height = 22;
  result.pages_crawled.forEach((page, idx) => {
    const r = idx + 2;
    accentCell(wsPg.getCell(r, 1), r - 1, "64748b");
    const c = setCell(wsPg, r, 2, page);
    dataStyle(c, r);
    c.font = { name: "Arial", size: 9, color: { argb: argb("7dd3fc") } };
    wsPg.getRow(r).height = 16;
  });

  // Sheet 6: Addresses (if any)
  if (result.addresses.length) {
    const ws = wb.addWorksheet("Addresses", { views: [{ showGridLines: false }] });
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 70;
    ["#", "Address"].forEach((h, i) => headerStyle(setCell(ws, 1, i + 1, h)));
    ws.getRow(1).height = 22;
    result.addresses.forEach((addr, idx) => {
      const r = idx + 2;
      accentCell(ws.getCell(r, 1), r - 1, "64748b");
      dataStyle(setCell(ws, r, 2, addr), r);
    });
  }

  // Sheet 7: Technologies (if any)
  if (result.tech.length) {
    const ws = wb.addWorksheet("Technologies", { views: [{ showGridLines: false }] });
    ws.getColumn(1).width = 24;
    ws.getColumn(2).width = 28;
    ["Category", "Technology"].forEach((h, i) => headerStyle(setCell(ws, 1, i + 1, h)));
    ws.getRow(1).height = 22;
    result.tech.forEach((t, idx) => {
      const r = idx + 2;
      dataStyle(setCell(ws, r, 1, t.category), r);
      const c = setCell(ws, r, 2, t.name);
      dataStyle(c, r);
      c.font = { name: "Arial", size: 9, color: { argb: argb("7dd3fc") } };
    });
  }

  // Sheet 8: SEO (if present)
  if (result.seo) {
    const s = result.seo;
    const ws = wb.addWorksheet("SEO", { views: [{ showGridLines: false }] });
    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 70;
    const seoRows: [string, string | number][] = [
      ["Title", s.title],
      ["Title length", s.titleLength],
      ["Meta description", s.metaDescription],
      ["Meta desc length", s.metaDescriptionLength],
      ["Meta keywords", s.metaKeywords],
      ["Canonical", s.canonical],
      ["Robots", s.robots],
      ["Lang", s.lang],
      ["Viewport tag", s.viewport ? "yes" : "no"],
      ["H1 count", s.h1.length],
      ["H1 (first)", s.h1[0] || ""],
      ["H2 count", s.h2.length],
      ["Images", s.imageCount],
      ["Images missing alt", s.imagesMissingAlt],
      ["Word count", s.wordCount],
      ["Internal links", s.internalLinks],
      ["External links", s.externalLinks],
    ];
    seoRows.forEach(([label, value], i) => {
      const r = i + 1;
      const a = setCell(ws, r, 1, label);
      const b = setCell(ws, r, 2, value);
      dataStyle(a, r);
      dataStyle(b, r);
      a.font = { bold: true, name: "Arial", size: 9, color: { argb: argb("94a3b8") } };
    });
  }

  // Sheet 9: Products (if any)
  if (result.products.length) {
    const ws = wb.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
    [30, 12, 10, 18, 18, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));
    ["Name", "Price", "Currency", "SKU", "Brand", "Availability"].forEach((h, i) =>
      headerStyle(setCell(ws, 1, i + 1, h)),
    );
    ws.getRow(1).height = 22;
    result.products.forEach((p, idx) => {
      const r = idx + 2;
      [p.name, p.price || "", p.currency || "", p.sku || "", p.brand || "", p.availability || ""].forEach(
        (v, i) => dataStyle(setCell(ws, r, i + 1, v), r),
      );
    });
  }

  // Sheet 10: Jobs (if any)
  if (result.jobs.length) {
    const ws = wb.addWorksheet("Jobs", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
    [34, 24, 24, 16, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));
    ["Title", "Company", "Location", "Type", "Posted"].forEach((h, i) =>
      headerStyle(setCell(ws, 1, i + 1, h)),
    );
    ws.getRow(1).height = 22;
    result.jobs.forEach((j, idx) => {
      const r = idx + 2;
      [j.title, j.company || "", j.location || "", j.employmentType || "", j.datePosted || ""].forEach(
        (v, i) => dataStyle(setCell(ws, r, i + 1, v), r),
      );
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── Bulk results ─────────────────────────────────────────────────────────────
export async function toExcelBulk(results: ScrapeResult[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // 1. Overview
  const wsOv = wb.addWorksheet("Overview", { views: [{ showGridLines: false }] });
  wsOv.mergeCells("A1:M1");
  const tc = wsOv.getCell("A1");
  tc.value = "🕷️ WebScrapeX — Bulk Extraction Report  |  " + nowUtc();
  tc.font = { bold: true, size: 13, color: { argb: argb("00d4ff") }, name: "Arial" };
  tc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("0a0e1a") } };
  tc.alignment = { horizontal: "center", vertical: "middle" };
  wsOv.getRow(1).height = 34;

  const ovHeaders = [
    "#", "Domain", "Title", "Status", "Emails", "Phones",
    "LinkedIn", "Facebook", "Instagram", "Twitter", "TikTok", "Pages", "Time (s)",
  ];
  const colWidths = [5, 28, 36, 10, 9, 9, 12, 12, 12, 10, 10, 9, 10];
  ovHeaders.forEach((h, i) => {
    headerStyle(setCell(wsOv, 2, i + 1, h));
    wsOv.getColumn(i + 1).width = colWidths[i];
  });
  wsOv.getRow(2).height = 22;

  results.forEach((res, idx) => {
    const r = idx + 3;
    const sl = res.social_links;
    const rowData: (string | number)[] = [
      idx + 1,
      res.domain || "",
      res.metadata?.title || "",
      (res.status || "").toUpperCase(),
      res.emails.length,
      res.phones.length,
      sl.linkedin.length,
      sl.facebook.length,
      sl.instagram.length,
      sl.twitter.length,
      sl.tiktok.length,
      res.pages_crawled.length,
      res.elapsed,
    ];
    rowData.forEach((val, i) => dataStyle(setCell(wsOv, r, i + 1, val), r));
    const statusCell = wsOv.getCell(r, 4);
    statusCell.font = {
      bold: true,
      name: "Arial",
      size: 9,
      color: { argb: argb(res.status === "success" ? "10b981" : "ef4444") },
    };
    wsOv.getRow(r).height = 16;
  });

  // Totals row with SUM formulas
  const totalRow = results.length + 3;
  const totalLabel = wsOv.getCell(totalRow, 1);
  totalLabel.value = "TOTAL";
  totalLabel.font = { bold: true, color: { argb: argb("00d4ff") }, name: "Arial", size: 9 };
  totalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("0a0e1a") } };
  const startRow = 3;
  const endRow = results.length + 2;
  for (let col = 5; col <= 13; col++) {
    const letter = colLetter(col);
    const c = wsOv.getCell(totalRow, col);
    c.value = { formula: `SUM(${letter}${startRow}:${letter}${endRow})` };
    c.font = { bold: true, color: { argb: argb("00d4ff") }, name: "Arial", size: 9 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("0a0e1a") } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }
  wsOv.getRow(totalRow).height = 18;
  wsOv.views = [{ state: "frozen", ySplit: 2, showGridLines: false }];

  // 2. All Emails
  const wsEm = wb.addWorksheet("All Emails", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  [5, 42, 28, 28].forEach((w, i) => (wsEm.getColumn(i + 1).width = w));
  ["#", "Email Address", "Email Domain", "Source Site"].forEach((h, i) =>
    headerStyle(setCell(wsEm, 1, i + 1, h)),
  );
  wsEm.getRow(1).height = 22;
  let emRow = 2;
  for (const res of results) {
    for (const email of res.emails) {
      const emailDomain = email.includes("@") ? email.split("@").pop()! : "";
      accentCell(wsEm.getCell(emRow, 1), emRow - 1, "64748b");
      const c = setCell(wsEm, emRow, 2, email);
      dataStyle(c, emRow);
      c.font = { name: "Arial", size: 9, color: { argb: argb("34d399") } };
      dataStyle(setCell(wsEm, emRow, 3, emailDomain), emRow);
      const s = setCell(wsEm, emRow, 4, res.domain || "");
      dataStyle(s, emRow);
      s.font = { name: "Arial", size: 9, color: { argb: argb("7dd3fc") } };
      wsEm.getRow(emRow).height = 15;
      emRow++;
    }
  }

  // 3. All Phones
  const wsPh = wb.addWorksheet("All Phones", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  [5, 35, 28].forEach((w, i) => (wsPh.getColumn(i + 1).width = w));
  ["#", "Phone Number", "Source Site"].forEach((h, i) => headerStyle(setCell(wsPh, 1, i + 1, h)));
  wsPh.getRow(1).height = 22;
  let phRow = 2;
  for (const res of results) {
    for (const phone of res.phones) {
      accentCell(wsPh.getCell(phRow, 1), phRow - 1, "64748b");
      const c = setCell(wsPh, phRow, 2, phone);
      dataStyle(c, phRow);
      c.font = { name: "Arial", size: 9, color: { argb: argb("fbbf24") } };
      const s = setCell(wsPh, phRow, 3, res.domain || "");
      dataStyle(s, phRow);
      s.font = { name: "Arial", size: 9, color: { argb: argb("7dd3fc") } };
      wsPh.getRow(phRow).height = 15;
      phRow++;
    }
  }

  // 4. Social Links
  const wsSl = wb.addWorksheet("Social Links", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  [5, 14, 62, 28].forEach((w, i) => (wsSl.getColumn(i + 1).width = w));
  ["#", "Platform", "Profile URL", "Source Site"].forEach((h, i) =>
    headerStyle(setCell(wsSl, 1, i + 1, h)),
  );
  wsSl.getRow(1).height = 22;
  let slRow = 2;
  for (const res of results) {
    for (const [platform, links] of Object.entries(res.social_links)) {
      for (const link of links) {
        accentCell(wsSl.getCell(slRow, 1), slRow - 1, "64748b");
        const c1 = setCell(wsSl, slRow, 2, capitalize(platform));
        dataStyle(c1, slRow);
        c1.font = {
          bold: true,
          name: "Arial",
          size: 9,
          color: { argb: argb(PLATFORM_COLORS[platform as SocialPlatform] || "a78bfa") },
        };
        const c2 = setCell(wsSl, slRow, 3, link);
        dataStyle(c2, slRow);
        c2.font = { name: "Arial", size: 9, color: { argb: argb("a78bfa") } };
        const c3 = setCell(wsSl, slRow, 4, res.domain || "");
        dataStyle(c3, slRow);
        c3.font = { name: "Arial", size: 9, color: { argb: argb("7dd3fc") } };
        wsSl.getRow(slRow).height = 15;
        slRow++;
      }
    }
  }

  // 5. Errors
  const wsEr = wb.addWorksheet("Errors", { views: [{ showGridLines: false }] });
  [5, 28, 65].forEach((w, i) => (wsEr.getColumn(i + 1).width = w));
  ["#", "Source Domain", "Error / Failed URL"].forEach((h, i) =>
    headerStyle(setCell(wsEr, 1, i + 1, h)),
  );
  wsEr.getRow(1).height = 22;
  let erRow = 2;
  for (const res of results) {
    for (const err of res.errors) {
      accentCell(wsEr.getCell(erRow, 1), erRow - 1, "64748b");
      dataStyle(setCell(wsEr, erRow, 2, res.domain || ""), erRow);
      const e = setCell(wsEr, erRow, 3, err);
      dataStyle(e, erRow);
      e.font = { name: "Arial", size: 9, color: { argb: argb("ef4444") } };
      wsEr.getRow(erRow).height = 15;
      erRow++;
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── helpers ──────────────────────────────────────────────────────────────────
function setCell(ws: ExcelJS.Worksheet, row: number, col: number, value: string | number): Cell {
  const c = ws.getCell(row, col);
  c.value = value;
  return c;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function colLetter(col: number): string {
  let letter = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}
