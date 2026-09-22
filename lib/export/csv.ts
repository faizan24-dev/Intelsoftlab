// CSV export — ported from utils.py to_csv() and the bulk CSV in app.py.

import type { ScrapeResult } from "@/lib/types";

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(",");
}

export function toCsv(result: ScrapeResult): string {
  const rows: string[] = [csvRow(["type", "value", "platform", "domain"])];
  const domain = result.domain || "";
  for (const email of result.emails) rows.push(csvRow(["email", email, "", domain]));
  for (const phone of result.phones) rows.push(csvRow(["phone", phone, "", domain]));
  for (const address of result.addresses) rows.push(csvRow(["address", address, "", domain]));
  for (const [platform, links] of Object.entries(result.social_links)) {
    for (const link of links) rows.push(csvRow(["social", link, platform, domain]));
  }
  for (const t of result.tech) rows.push(csvRow(["technology", t.name, t.category, domain]));
  return rows.join("\n") + "\n";
}

export function toBulkCsv(results: ScrapeResult[]): string {
  const rows: string[] = [csvRow(["type", "value", "platform", "source_domain"])];
  for (const r of results) {
    const domain = r.domain || "";
    for (const email of r.emails) rows.push(csvRow(["email", email, "", domain]));
    for (const phone of r.phones) rows.push(csvRow(["phone", phone, "", domain]));
    for (const [platform, links] of Object.entries(r.social_links)) {
      for (const link of links) rows.push(csvRow(["social", link, platform, domain]));
    }
  }
  return rows.join("\n") + "\n";
}
