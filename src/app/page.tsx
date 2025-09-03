import { headers as nextHeaders } from "next/headers";
import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";
import { TopList } from "@/components/TopList"; 
import { SubmissionsPanel } from "@/components/SubmissionsPanel";
import { TopStatesMap } from "@/components/TopStatesMap";
import { Activity, MapPinned, PawPrint, Building2 } from "lucide-react"; 
import { KpiCard } from "@/components/KpiCard";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { RefreshNow } from "@/components/RefreshNow";

const desiredHeaders = [
  "Id Registro",
  "Data Observacao",
  "Tipo Animal",
  "Nome científico",
  "Nível Taxonômico",
  "Status Validação",
  "Estado",
  "Município",
  "Latitude",
  "Longitude",
];

type Summary = {
  updatedAt: string;
  headers: string[];
  rows: Record<string, string>[];
  summary: {
    totals: { submissions: number };
    submissionsOverTime: { date: string; count: number }[];
    topAnimals: { name: string; count: number }[];
    topStates: { state: string; count: number }[];
    topCities: { city: string; count: number }[];   // ← add this
  };
};

function normalizeAnimal(name: string) {
  return name.replace(/^\s*ave[:\-]?\s*/i, "").trim();
}

function toISODate(dmy: string): string | null {
  // input like "02/03/2025" (dd/MM/yyyy) → "2025-03-02"
  const [dd, mm, yyyy] = dmy.split("/");
  if (!dd || !mm || !yyyy) return null;
  const d = Number(dd), m = Number(mm), y = Number(yyyy);
  if (!d || !m || !y) return null;
  // zero-pad
  const dd2 = String(d).padStart(2, "0");
  const mm2 = String(m).padStart(2, "0");
  return `${y}-${mm2}-${dd2}`;
}


function summarize(rows: Record<string, string>[]): Summary["summary"] {
  const byDay = new Map<string, number>();
  const byAnimal = new Map<string, number>();
  const byState = new Map<string, number>();
  const byCity = new Map<string, number>();   // ← new

  for (const r of rows) {
    // ----- date → ISO (fixes "Invalid Date" in charts) -----
    const rawDate = (r["Data Observacao"] || "").slice(0, 10); // e.g. "02/03/2025"
    let iso: string | null = null;
    if (rawDate.includes("/")) {
      iso = toISODate(rawDate);            // dd/MM/yyyy → yyyy-MM-dd
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      iso = rawDate;                        // already ISO
    }
    if (iso) byDay.set(iso, (byDay.get(iso) || 0) + 1);

    // ----- animal label cleanup (drops "Ave:" etc.) -----
    const aRaw = (r["Tipo Animal"] || "").trim();
    const a = normalizeAnimal(aRaw);
    if (a) byAnimal.set(a, (byAnimal.get(a) || 0) + 1);

    // ----- state tally -----
    const s = (r["Estado"] || "").trim();
    if (s) byState.set(s, (byState.get(s) || 0) + 1);

    const c = (r["Município"] || "").trim();   // ← from CSV
    if (c) byCity.set(c, (byCity.get(c) || 0) + 1);
  }

  const submissionsOverTime = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((x, y) => x.date.localeCompare(y.date));

  const topAnimals = Array.from(byAnimal.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 10);

  const topStates = Array.from(byState.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 10);

  const topCities = Array.from(byCity.entries())          // ← new
    .map(([city, count]) => ({ city, count }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 10);

  return {
    totals: { submissions: rows.length },
    submissionsOverTime,
    topAnimals,
    topStates,
    topCities,
  };
}


async function baseUrl() {
  const h = await nextHeaders();
  const host = h.get("x-forwarded-host") ?? h.get("host")!;
  const proto = h.get("x-forwarded-proto") ?? (process.env.VERCEL ? "https" : "http");
  return `${proto}://${host}`;
}

async function getSummary(): Promise<Summary | null> {
  const base = await baseUrl();
  const res = await fetch(`${base}/api/summary`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function getLiveCsvRows(): Promise<Record<string, string>[]> {
  const base = await baseUrl();
  const res = await fetch(`${base}/api/source-csv`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load CSV (${res.status})`);

  const buf = Buffer.from(await res.arrayBuffer());
  const csv = iconv.decode(buf, "latin1");

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/html") || /^<!doctype html/i.test(csv) || /<html/i.test(csv)) {
    throw new Error("Source returned HTML instead of CSV. Open /api/source-csv to inspect.");
  }

  const allRows = parse(csv, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    bom: true,
    delimiter: ";",
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  return allRows.map((row) => {
    const out: Record<string, string> = {};
    for (const col of desiredHeaders) out[col] = row[col] ?? "";
    return out;
  });
}

export default async function Page() {
  // Try fast JSON; fall back to live CSV
  const pre = await getSummary();
  let updatedAt: string;
  let rows: Record<string, string>[];
  let summary: Summary["summary"];

  if (pre) {
    updatedAt = pre.updatedAt;
    rows = pre.rows;
    summary = pre.summary;
  } else {
    rows = await getLiveCsvRows();
    updatedAt = new Date().toISOString();
    summary = summarize(rows);
  }

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

    {/* No function props passed to client component */}
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
          items={summary.topAnimals.map(a => ({ label: a.name, count: a.count }))}
        />
      </div>
    </div>

    {/* Row 2: Time series + States map */}
    <div className="mx-auto max-w-6xl mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SubmissionsPanel data={summary.submissionsOverTime} />
      <TopStatesMap
        title="Most reported states"
        data={summary.topStates}
      />
    </div>
    <div className="mx-auto max-w-6xl mt-6">
    <a href="https://sissgeo.lncc.br/mapaRegistrosInicial.xhtml">Source data: Siss Geo</a>
    </div>
    <SpeedInsights />
  </main>
);
}