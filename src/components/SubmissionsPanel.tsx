// src/components/SubmissionsPanel.tsx
"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Point = { date: string; count: number };

const RANGES = [
  { key: "24h", label: "24h", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "3m", days: 90 },
  { key: "270d", label: "9m", days: 270 },
  { key: "all", label: "All", days: Infinity },
] as const;

type RangeKey = typeof RANGES[number]["key"];

export function SubmissionsPanel({ data }: { data: Point[] }) {
  const [range, setRange] = React.useState<RangeKey>("30d");

  // 1) Filter by chosen range
  const filtered = React.useMemo(() => {
    if (!data?.length || range === "all") return data ?? [];
    const cfg = RANGES.find((r) => r.key === range)!;
    const now = new Date();
    const cutoff = new Date(now);
    if (cfg.days === Infinity) return data;
    // subtract N days (inclusive of today)
    cutoff.setDate(now.getDate() - (cfg.days - 1));
    return data.filter((p) => {
      const d = new Date(p.date + "T00:00:00");
      return d >= cutoff;
    });
  }, [data, range]);

  // 2) Convert to time series (ms since epoch)
  const timeData = React.useMemo(
    () =>
      (filtered ?? []).map((p) => ({
        t: new Date(p.date + "T00:00:00").getTime(),
        count: p.count,
      })),
    [filtered]
  );

  // 3) Build exactly 6 evenly-spaced ticks
  const ticks = React.useMemo(() => {
    if (!timeData.length) return [] as number[];
    const values = timeData.map((d) => d.t);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return [min];
    const step = (max - min) / 5;
    return Array.from({ length: 6 }, (_, i) => Math.round(min + i * step));
  }, [timeData]);

  return (
    <div className="card p-4">
      {/* Header + filters */}
      <div className="mb-3 flex flex-wrap items-center justify-start gap-2">
        <div className="font-medium mr-3">Submissions over time</div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={[
                  "rounded-full px-3 py-1 text-sm border transition",
                  active
                    ? "bg-[var(--tone-b)] text-white border-[var(--tone-b)]"
                    : "bg-white/70 border-white/70 hover:bg-white",
                ].join(" ")}
                aria-pressed={active}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={timeData}
            margin={{ top: 8, right: 36, left: -18, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickMargin={4}
              tick={{ fontSize: 12, textAnchor: "start" }}
              tickFormatter={(ms: number) => {
                const d = new Date(ms);
                const dd = String(d.getDate()).padStart(2, "0");
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                return `${dd}/${mm}`;
              }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(ms) => {
                const d = new Date(Number(ms));
                return d.toLocaleDateString("pt-BR");
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--tone-b)"
              fill="var(--tone-b)"
              fillOpacity={0.22}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
