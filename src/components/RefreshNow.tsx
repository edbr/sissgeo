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
      // 1) trigger server refresh (pulls source → writes CSV/JSON to S3)
      const r = await fetch("/api/refresh", { method: "GET" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      // 2) ensure we fetch fresh summary on this client
      await fetch("/api/summary", { cache: "no-store" });

      // 3) re-render the RSC page without full navigation
      router.refresh();

      // 4) optional: download CSV
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

      <a
        href={process.env.NEXT_PUBLIC_CSV_URL}
        target="_blank"
        rel="noreferrer"
        className="rounded-full px-3 py-1.5 text-sm border bg-white/70 border-white/70 hover:bg-white"
      >
        Download latest CSV
      </a>

      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
