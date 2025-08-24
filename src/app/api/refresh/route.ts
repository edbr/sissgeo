import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! }
    : undefined,
});

// change if your S3_KEY is different
const CSV_KEY = process.env.S3_KEY || "latest.csv";
const JSON_KEY = CSV_KEY.replace(/\.csv$/i, ".json");

const desiredHeaders = [
  "Id Registro","Data Observacao","Tipo Animal","Nome científico","Nível Taxonômico",
  "Status Validação","Estado","Município","Latitude","Longitude",
];

function normalizeAnimal(name: string) {
  // drop leading "Ave:" (any case, with/without spaces/colon)
  return name.replace(/^\s*ave[:\-]?\s*/i, "").trim();
}

function summarize(rows: Record<string, string>[]) {
  // submissions per day (YYYY-MM-DD)
  const byDay = new Map<string, number>();
  // top animals
  const byAnimal = new Map<string, number>();
  // top states
  const byState = new Map<string, number>();

  
  for (const r of rows) {
    const d = (r["Data Observacao"] || "").slice(0, 10); // assume yyyy-mm-dd
    if (d) byDay.set(d, (byDay.get(d) || 0) + 1);

      // 🔧 normalize animal label
    const aRaw = (r["Tipo Animal"] || "").trim();
    const a = normalizeAnimal(aRaw);
    if (a) byAnimal.set(a, (byAnimal.get(a) || 0) + 1);

    const s = (r["Estado"] || "").trim();
    if (s) byState.set(s, (byState.get(s) || 0) + 1);
  }

  const submissionsOverTime = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topAnimals = Array.from(byAnimal.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topStates = Array.from(byState.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totals: { submissions: rows.length },
    submissionsOverTime,
    topAnimals,
    topStates,
  };
}

export async function GET() {
  try {
    // 1) Get live CSV via your proxy
    const baseUrl = `https://` + (process.env.VERCEL_URL || "localhost:3000");
    const res = await fetch(`${baseUrl}/api/source-csv`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "source fetch failed", status: res.status }, { status: 502 });

    const csvBuf = Buffer.from(await res.arrayBuffer());

    // 2) Save CSV
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: CSV_KEY,
      Body: csvBuf,
      ContentType: "text/csv; charset=latin1",
      CacheControl: "no-cache",
    }));

    // 3) Decode + parse ➜ reduce columns
    const csv = iconv.decode(csvBuf, "latin1");
    const allRows = parse(csv, {
      columns: (h: string[]) => h.map((x) => x.trim()),
      skip_empty_lines: true,
      delimiter: ";",
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    }) as Record<string, string>[];

    const rows = allRows.map((row) => {
      const r: Record<string, string> = {};
      for (const col of desiredHeaders) r[col] = row[col] ?? "";
      return r;
    });

    // 4) Summaries + timestamp
    const summary = summarize(rows);
    const payload = {
      updatedAt: new Date().toISOString(),
      headers: desiredHeaders,
      rows,
      summary,
    };

    // 5) Save JSON
    const jsonBuf = Buffer.from(JSON.stringify(payload));
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: JSON_KEY,
      Body: jsonBuf,
      ContentType: "application/json",
      CacheControl: "public, max-age=60",
    }));

    return NextResponse.json({ ok: true, csvKey: CSV_KEY, jsonKey: JSON_KEY, rows: rows.length });
  } catch (e: unknown) {
  const msg = e instanceof Error ? e.message : "refresh failed";
  return NextResponse.json({ error: msg }, { status: 500 });
}
}
