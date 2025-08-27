"use client";

import * as React from "react";

export default function Loading() {
  // Simulated progress (since server work doesn't report granular progress)
  const [pct, setPct] = React.useState(8);

  React.useEffect(() => {
    let p = 8;
    const id = setInterval(() => {
      // ease towards 90% while we wait for SSR to finish
      p = Math.min(90, Math.round(p + (100 - p) * 0.08));
      setPct(p);
    }, 120);
    return () => clearInterval(id); // unmounts when the page has streamed
  }, []);

  return (
    <main className="min-h-screen grid place-items-center bg-[var(--surface)]">
      <div className="w-full max-w-md px-6">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-[var(--ink)]">SISS-Geo Dashboard</h1>
          <p className="text-sm text-black/60">Fetching the latest data…</p>
        </div>

        <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
          {/* background bar */}
          <div
            className="h-full rounded-full bg-[var(--tone-b)] transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            role="progressbar"
          />
        </div>

        <div className="mt-2 text-right text-xs tabular-nums text-black/60">{pct}%</div>

        {/* subtle “barber pole” shimmer (purely cosmetic) */}
        <div className="relative mt-6 h-10 rounded-xl overflow-hidden bg-white/60 border border-black/10">
          <div className="absolute inset-0 animate-loading-stripes pointer-events-none" />
          <div className="absolute inset-0 grid place-items-center text-xs text-black/60">
            Loading…
          </div>
        </div>
      </div>
    </main>
  );
}
