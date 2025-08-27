"use client";

import * as React from "react";
import { TopBar } from "@/components/TopBar";
import { TopStatesMap } from "@/components/TopStatesMap";

type Item = { state: string; count: number };

export function StatesToggle({
  data,
  title = "Most reported states",
}: {
  data: Item[];
  title?: string;
}) {
  const [view, setView] = React.useState<"map" | "bars">("map");

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">{title}</div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("map")}
            className={
              "rounded-full px-3 py-1 text-sm border transition " +
              (view === "map"
                ? "bg-[var(--tone-b)] text-white border-[var(--tone-b)]"
                : "bg-white/70 border-white/70 hover:bg-white")
            }
            aria-pressed={view === "map"}
          >
            Map
          </button>
          <button
            onClick={() => setView("bars")}
            className={
              "rounded-full px-3 py-1 text-sm border transition " +
              (view === "bars"
                ? "bg-[var(--tone-b)] text-white border-[var(--tone-b)]"
                : "bg-white/70 border-white/70 hover:bg-white")
            }
            aria-pressed={view === "bars"}
          >
            Bars
          </button>
        </div>
      </div>

      {view === "map" ? (
        <TopStatesMap title={title} data={data} />
      ) : (
        <TopBar
          title={title}
          data={data.map((s) => ({ label: s.state, count: s.count }))}
          colorVar="var(--tone-b)"
          horizontal
        />
      )}
    </div>
  );
}
