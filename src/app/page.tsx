// src/app/page.tsx
import { TopList } from "@/components/TopList";
import { SubmissionsPanel } from "@/components/SubmissionsPanel";
import { TopStatesMap } from "@/components/TopStatesMap";
import { Activity, MapPinned, PawPrint, Building2 } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { RefreshNow } from "@/components/RefreshNow";
import { YesterdayTable } from "@/components/YesterdayTable";


type Summary = {
  updatedAt: string;
  headers: string[];
  rows: Record<string, string>[];
  summary: {
    totals: { submissions: number };
    submissionsOverTime: { date: string; count: number }[];
    topAnimals: { name: string; count: number }[];
    topStates: { state: string; count: number }[];
    topCities: { city: string; count: number }[];
  };
};

// --- Fetch helpers ----------------------------------------------------------

async function getSummaryFromS3(): Promise<Summary | null> {
  const jsonUrl =
    process.env.NEXT_PUBLIC_JSON_URL ||
    process.env.NEXT_PUBLIC_CSV_URL?.replace(/\.csv$/i, ".json");

  if (!jsonUrl) return null;

  const res = await fetch(jsonUrl, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Summary;
}

async function getSummaryFromInternal(): Promise<Summary | null> {
  // Fallback to your internal API (which may proxy/cache)
  const base =
    (process.env.VERCEL ? "https://" : "http://") + (process.env.VERCEL_URL || "localhost:3000");
  const res = await fetch(`${base}/api/summary`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Summary;
}

// --- Page -------------------------------------------------------------------

export default async function Page() {
  // Prefer S3 JSON; fallback to internal summary
  const pre = (await getSummaryFromS3()) ?? (await getSummaryFromInternal());
  if (!pre) {
    // Hard failure UI (rare)
    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-semibold mb-2">SISS-Geo Dashboard</h1>
          <p className="text-sm text-red-600">
            Couldn’t load data. Check your <code>NEXT_PUBLIC_JSON_URL</code> or try Refresh.
          </p>
          <div className="mt-4"><RefreshNow downloadAfter={false} /></div>
        </div>
      </main>
    );
  }

  const { updatedAt, summary } = pre;

  return (
    <main className="min-h-screen p-6 md:p-10 fade-in">
      <div className="mx-auto max-w-6xl grid mb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">SISS-Geo Dashboard</h1>
            <div className="text-sm text-muted-foreground">
              {`Last updated: ${new Date(updatedAt).toLocaleString()}`}
            </div>
          </div>
          <RefreshNow downloadAfter={false} />
        </div>
      </div>

      {/* Row 1: KPIs (left) + TopList (right) */}
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT: 2x2 KPI grid spans 2 columns on large screens */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <KpiCard
            title="Total submissions"
            value={summary.totals.submissions.toLocaleString()}
            tone="a"
            icon={<Activity className="h-5 w-5" />}
            hint="All-time"
          />
          <KpiCard
            title="Top state"
            value={summary.topStates[0]?.state ?? "—"}
            tone="b"
            icon={<MapPinned className="h-5 w-5" />}
            hint="By report count"
          />
          <KpiCard
            title="Top animal"
            value={summary.topAnimals[0]?.name ?? "—"}
            tone="ink"
            icon={<PawPrint className="h-5 w-5" />}
          />
          <KpiCard
            title="Top city"
            value={summary.topCities[0]?.city ?? "—"}
            tone="b"
            icon={<Building2 className="h-5 w-5" />}
          />
        </div>

        {/* RIGHT: TopList */}
        <div className="lg:col-span-2">
          <TopList
            title="Submissions by animal"
            items={summary.topAnimals.map((a) => ({ label: a.name, count: a.count }))}
          />
        </div>
      </div>

      {/* Row 2: Time series + States map */}
      <div className="mx-auto max-w-6xl mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubmissionsPanel data={summary.submissionsOverTime} />
        <TopStatesMap title="Most reported states" data={summary.topStates} />
      </div>
   <YesterdayTable />
      <div className="mx-auto max-w-6xl mt-6">
        <a href="https://sissgeo.lncc.br/mapaRegistrosInicial.xhtml">Source data: SISS-Geo</a>
      </div>

      <SpeedInsights />
    </main>
  );
}
