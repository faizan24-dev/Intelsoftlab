// Shared bits for the tool UI: metric cards, social icons, export download.

import type { SocialPlatform } from "@/lib/types";

export function MetricCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-2xl font-bold text-brand-600">{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
    </div>
  );
}

export const SOCIAL_ICONS: Record<SocialPlatform, string> = {
  linkedin: "💼",
  facebook: "👤",
  instagram: "📸",
  twitter: "🐦",
  tiktok: "🎵",
  youtube: "▶️",
  pinterest: "📌",
  whatsapp: "💬",
};

export type ExportFormat = "xlsx" | "csv" | "json";
export type ExportMode = "single" | "bulk";

export async function downloadExport(
  format: ExportFormat,
  mode: ExportMode,
  payload: Record<string, unknown>,
): Promise<void> {
  const resp = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format, mode, ...payload }),
  });
  if (!resp.ok) {
    let msg = "Export failed";
    try {
      const data = await resp.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    alert(msg);
    return;
  }
  const blob = await resp.blob();
  const cd = resp.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename="(.+?)"/);
  const filename = match?.[1] || `export.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </p>
  );
}
