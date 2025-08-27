"use client";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export function SubmissionsChart({
  data,
  bare = false,
  title = "Submissions over time",
}: {
  data: { date: string; count: number }[];
  bare?: boolean;
  title?: string;
}) {
  const chart = (
    <div className={bare ? "h-64" : "h-64"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
         <XAxis
            dataKey="date"
            tickFormatter={(d: string) => {
              const dt = new Date(d);
              const dd = String(dt.getDate()).padStart(2, "0");
              const mm = String(dt.getMonth() + 1).padStart(2, "0");
              return `${dd}/${mm}`;
            }}
          />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(d) => new Date(d as string).toLocaleDateString("pt-BR")} />
          <Area type="monotone" dataKey="count" stroke="var(--tone-b)" fill="var(--tone-b)" fillOpacity={0.25} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  if (bare) return chart;

  return (
    <div className="card p-4">
      <div className="font-medium mb-2">{title}</div>
      {chart}
    </div>
  );
}
