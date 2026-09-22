"use client";

import { useState } from "react";
import SingleMode from "@/components/tool/SingleMode";
import BulkMode from "@/components/tool/BulkMode";

type Mode = "single" | "bulk";

export default function WebsiteExtractor() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setMode("single")}
          className={`rounded-lg py-2.5 text-sm font-semibold transition ${
            mode === "single" ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink-soft"
          }`}
        >
          🔍 Single URL
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={`rounded-lg py-2.5 text-sm font-semibold transition ${
            mode === "bulk" ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink-soft"
          }`}
        >
          📋 Bulk URLs
        </button>
      </div>

      {mode === "single" ? <SingleMode /> : <BulkMode />}
    </div>
  );
}
