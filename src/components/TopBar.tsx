"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function TopBar({
  title,
  data,
  colorVar = "var(--tone-a)",
  horizontal = false, // ← new
}: {
  title: string;
  data: { label: string; count: number }[];
  colorVar?: string;
  horizontal?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="font-medium mb-2">{title}</div>
      <div className={horizontal ? "h-80" : "h-64"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}   // ← switch layout
            margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            {horizontal ? (
              <>
                {/* X = values, Y = categories */}
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
              </>
            ) : (
              <>
                {/* X = categories, Y = values */}
                <XAxis dataKey="label" interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
              </>
            )}

            <Tooltip />
            <Bar dataKey="count" fill={colorVar} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
