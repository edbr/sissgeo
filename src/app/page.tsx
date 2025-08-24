import { parse } from "csv-parse/sync";
import { headers as nextHeaders } from "next/headers";
import { ClientParts } from "@/components/ClientParts";
import iconv from "iconv-lite";

// 🔖 Columns to display (and order)
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

async function getRows() {
  // Next 15: headers() is async
  const h = await nextHeaders();

  // Build absolute base URL (proxy-aware)
  const host = h.get("x-forwarded-host") ?? h.get("host")!;
  const protocol = h.get("x-forwarded-proto") ?? (process.env.VERCEL ? "https" : "http");
  const base = `${protocol}://${host}`;

  // Fetch live CSV via our proxy route
  const res = await fetch(`${base}/api/source-csv`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load CSV (${res.status})`);

  // Decode explicitly as Latin-1 (fixes accents)
  const buf = Buffer.from(await res.arrayBuffer());
  const csv = iconv.decode(buf, "latin1");

  // Guard: if server sent HTML/error instead of CSV
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/html") || /^<!doctype html/i.test(csv) || /<html/i.test(csv)) {
    throw new Error("Source returned HTML instead of CSV. Open /api/source-csv to inspect.");
  }

  // Parse semicolon-separated CSV
  const allRows = parse(csv, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    bom: true,
    delimiter: ";",
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  // Keep only the desired columns (and preserve order)
  const filteredRows = allRows.map((row) => {
    const out: Record<string, string> = {};
    for (const col of desiredHeaders) {
      out[col] = row[col] ?? "";
    }
    return out;
  });

  return filteredRows;
}

export default async function Page() {
  const rows = await getRows();
  const cols = desiredHeaders;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">SISS-Geo Data (live)</h1>
      {rows.length ? (
        <ClientParts headers={cols} rows={rows} />
      ) : (
        <p className="text-sm text-muted-foreground">No data.</p>
      )}
    </main>
  );
}
