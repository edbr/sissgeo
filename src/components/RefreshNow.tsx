// src/components/RefreshNow.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  downloadAfter?: boolean; // if true, auto-open the CSV after refresh
};

export function RefreshNow({ downloadAfter = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function handle() {
    setBusy(true);
    setMsg(null);
    try {
      // 1) Trigger refresh (server pulls source → writes CSV+JSON to S3)
      const r = await fetch("/api/refresh", { method: "GET" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      // 2) Force a re-render (so page refetches NEXT_PUBLIC_JSON_URL)
      router.refresh();

      // 3) Optional: download CSV after refresh
      if (downloadAfter && process.env.NEXT_PUBLIC_CSV_URL) {
        window.open(process.env.NEXT_PUBLIC_CSV_URL, "_blank", "noreferrer");
      }

      setMsg("Updated!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handle}
        disabled={busy}
        className={[
          "rounded-full px-3 py-1.5 text-sm border transition",
          busy
            ? "opacity-50 cursor-not-allowed bg-white/70 border-white/70"
            : "bg-[var(--tone-b)] text-white border-[var(--tone-b)] hover:opacity-90",
        ].join(" ")}
      >
        {busy ? "Refreshing…" : "Refresh data"}
      </button>

      {/* Download links */}
      {process.env.NEXT_PUBLIC_CSV_URL && (
        <a
          href={process.env.NEXT_PUBLIC_CSV_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-3 py-1.5 text-sm border bg-white/70 border-white/70 hover:bg-white"
        >
          Download CSV
        </a>
      )}

      {process.env.NEXT_PUBLIC_JSON_URL && (
        <a
          href={process.env.NEXT_PUBLIC_JSON_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-3 py-1.5 text-sm border bg-white/70 border-white/70 hover:bg-white"
        >
          Download JSON
        </a>
      )}

      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
