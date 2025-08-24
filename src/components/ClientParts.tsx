"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function toTitle(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function ClientParts({ headers, rows }: { headers: string[]; rows: Record<string, string>[] }) {
  const [q, setQ] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const filtered = React.useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => headers.some((h) => (r[h] ?? "").toLowerCase().includes(needle)));
  }, [q, rows, headers]);

  async function refreshNow() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/refresh");   // 👈 here
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setMsg(`Refreshed ${j.bytes ?? ""} bytes`);
    } catch (e: unknown) {
  const msg =
    typeof e === "object" && e !== null && "message" in e
      ? String((e as { message?: unknown }).message)
      : "failed";
  setMsg(`Error: ${msg}`);
} finally {
  setLoading(false);
}

  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <Button onClick={refreshNow} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh now"}
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>

      <div className="rounded-xl border bg-background">
        <ScrollArea className="w-full h-[70vh]">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={h} className="whitespace-nowrap">{toTitle(h)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => (
                      <TableCell key={h} className="align-top">{row[h] ?? ""}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
      <div className="text-xs text-muted-foreground">
        Showing {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} rows
      </div>
    </div>
  );
}
