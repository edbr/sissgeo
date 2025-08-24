// lib/parseCsv.ts
import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;

export function parseCsvToObjects(csv: string): CsvRow[] {
  const records = parse(csv, {
    columns: true,         // first row as headers
    skip_empty_lines: true,
    bom: true,             // handle UTF-8 BOM if present
    cast: (value) => (value ?? "").toString().trim(),
  });
  return records as CsvRow[];
}
