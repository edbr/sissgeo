import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";

export const runtime = "nodejs";

/** Simple logger that namespaces messages */
function log(step: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[refresh] ${step}`, typeof data === "string" ? data : JSON.stringify(data));
  } else {
    console.log(`[refresh] ${step}`);
  }
}
function logError(step: string, err: unknown) {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.error(`[refresh] ${step} FAILED`, msg);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

const region = requireEnv("AWS_REGION");             // will throw + log if missing
const bucket = requireEnv("S3_BUCKET");
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region,
  credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
});

// Keys (your .env has S3_KEY=sissgeo/latest.csv)
const CSV_KEY = process.env.S3_KEY || "latest.csv";
const JSON_KEY = CSV_KEY.replace(/\.csv$/i, ".json");

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

function normalizeAnimal(name: string) {
  return name.replace(/^\s*ave[:\-]?\s*/i, "").trim();
}

function summarize(rows: Record<string, string>[]) {
  const byDay = new Map<string, number>();
  const byAnimal = new Map<string, number>();
  const byState = new Map<string, number>();
  const byCity = new Map<string, number>();

  for (const r of rows) {
    const d = (r["Data Observacao"] || "").slice(0, 10);
    if (d) byDay.set(d, (byDay.get(d) || 0) + 1);

    const aRaw = (r["Tipo Animal"] || "").trim();
    const a = normalizeAnimal(aRaw);
    if (a) byAnimal.set(a, (byAnimal.get(a) || 0) + 1);

    const s = (r["Estado"] || "").trim();
    if (s) byState.set(s, (byState.get(s) || 0) + 1);

    const c = (r["Município"] || "").trim();
    if (c) byCity.set(c, (byCity.get(c) || 0) + 1);
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

  const topCities = Array.from(byCity.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totals: { submissions: rows.length },
    submissionsOverTime,
    topAnimals,
    topStates,
    topCities,
  };
}

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:3000`;
}

export async function GET() {
  const t0 = Date.now();
  try {
    log("start", { region, bucket, CSV_KEY, JSON_KEY });

    // 1) Get live CSV via your proxy
    const baseUrl = getBaseUrl();
    const sourceUrl = `${baseUrl}/api/source-csv`;
    log("fetch source", sourceUrl);

    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logError("source fetch", `${res.status} ${res.statusText} ${text.slice(0, 200)}`);
      return NextResponse.json(
        { error: "source fetch failed", status: res.status, detail: res.statusText },
        { status: 502 }
      );
    }
    const csvBuf = Buffer.from(await res.arrayBuffer());
    log("source ok", { bytes: csvBuf.length });

    // 2) Save CSV to S3
    log("s3 put csv", { bucket, key: CSV_KEY });
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: CSV_KEY,
        Body: csvBuf,
        ContentType: "text/csv; charset=latin1",
        CacheControl: "no-cache",
      })
    );
    log("s3 put csv done");

    // 3) Decode + parse ➜ reduce columns
    log("parse csv");
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
    log("parsed", { rows: rows.length });

    // 4) Summaries + timestamp
    log("summarize");
    const payload = {
      updatedAt: new Date().toISOString(),
      headers: desiredHeaders,
      rows,
      summary: summarize(rows),
    };

    // 5) Save JSON to S3
    log("s3 put json", { bucket, key: JSON_KEY });
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: JSON_KEY,
        Body: Buffer.from(JSON.stringify(payload)),
        ContentType: "application/json",
        CacheControl: "no-cache",
      })
    );
    log("s3 put json done");

    const ms = Date.now() - t0;
    log("done", { ms });

    return NextResponse.json({
      ok: true,
      csvKey: CSV_KEY,
      jsonKey: JSON_KEY,
      rows: rows.length,
      ms,
    });
  } catch (e: unknown) {
    logError("catch", e);
    const msg = e instanceof Error ? e.message : "refresh failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
