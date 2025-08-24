// src/components/DashboardClient.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { SubmissionsChart } from "@/components/SubmissionsChart";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/Card";


export type Summary = {
  updatedAt: string;
  headers: string[];
  rows: Record<string, string>[]; // still present, just not rendered
  summary: {
    totals: { submissions: number };
    submissionsOverTime: { date: string; count: number }[];
    topAnimals: { name: string; count: number }[];
    topStates: { state: string; count: number }[];
    topCities: { city: string; count: number }[]; // ← add this
  };
};

export function DashboardClient({ initial }: { initial: Summary }) {
  const [data, setData] = React.useState<Summary>(initial);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function refreshNow() {
    setLoading(true);
    setMsg(null);
    try {
      // 1) run the server refresh (pulls source → writes CSV+JSON to S3)
      const r = await fetch("/api/refresh");
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      // 2) re-fetch summary fresh (no cache)
      const s = await fetch("/api/summary", { cache: "no-store" });
      if (!s.ok) throw new Error(`Summary fetch failed: ${s.status}`);
      const next = (await s.json()) as Summary;
      setData(next);
      setMsg("Updated!");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg(m);
    } finally {
      setLoading(false);
    }
  }

  const { updatedAt, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header / freshness */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">SISS-Geo Dashboard</h1>
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date(updatedAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={refreshNow} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh now"}
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>

      {/* KPIs */}
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <Kpi title="Total submissions" value={summary.totals.submissions.toLocaleString()} variant="duo-a" />
  <Kpi title="Top animal" value={summary.topAnimals[0]?.name ?? "—"} variant="duo-b" />
  <Kpi title="Top state" value={summary.topStates[0]?.state ?? "—"} />  
  <Kpi title="Top city" value={summary.topCities[0]?.city ?? "—"} />
</div>


      {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <SubmissionsChart data={summary.submissionsOverTime} />
  <TopBar
    title="Most reported animals"
    data={summary.topAnimals.map(a => ({ label: a.name, count: a.count }))}
    colorVar="--tone-a"
  />
  <TopBar
    title="Most reported states"
    data={summary.topStates.map(s => ({ label: s.state, count: s.count }))}
    colorVar="--tone-b"
  />
</div>
    </div>
  );
}

function Kpi({ title, value, variant }: { title: string; value: string; variant?: "duo-a"|"duo-b" }) {
  return (
    <Card variant={variant} className="p-5">
      <div className="text-xs text-black/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </Card>
  );
}
