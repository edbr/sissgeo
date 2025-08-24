"use client";

import * as React from "react";
import { SubmissionsChart } from "@/components/SubmissionsChart";

type Point = { date: string; count: number };

const RANGES = [
  { key: "24h",  label: "24h", days: 1 },
  { key: "7d",   label: "7d",  days: 7 },
  { key: "30d",  label: "30d", days: 30 },
  { key: "90d",  label: "3m",  days: 90 },
  { key: "270d", label: "9m",  days: 270 },
  { key: "all",  label: "All", days: Infinity },
] as const;

type RangeKey = typeof RANGES[number]["key"];

export function SubmissionsPanel({ data }: { data: Point[] }) {
  const [range, setRange] = React.useState<RangeKey>("30d");

  const filtered = React.useMemo(() => {
    if (!data?.length) return [];
    if (range === "all") return data;

    const days = RANGES.find((r) => r.key === range)!.days;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - (days - 1));
    return data.filter((p) => new Date(p.date + "T00:00:00") >= cutoff);
  }, [data, range]);

  return (
    <div className="card p-4">
      {/* Card header with title + pills */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-medium">Submissions over time</div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => {
            const isActive = range === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={[
                  "rounded-full px-3 py-1 text-sm border transition",
                  isActive
                    ? "bg-[var(--tone-b)] text-white border-[var(--tone-b)]"
                    : "bg-white/70 border-white/70 hover:bg-white",
                ].join(" ")}
                aria-pressed={isActive}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart body (bare) */}
      <SubmissionsChart data={filtered} bare />
    </div>
  );
}
