"use client";

import * as React from "react";
import { cn } from "@/lib/cn"; // tiny classNames helper; or use clsx

type Tone = "a" | "b" | "ink" | "neutral";

export function KpiCard({
  title,
  value,
  unit,
  hint,
  icon,
  delta,                 // e.g. +4.2% or -1.1%
  tone = "neutral",
  loading = false,
  href,
  className,
}: {
  title: string;
  value?: string | number;
  unit?: string;         // e.g. "reports"
  hint?: string;         // e.g. "vs last week"
  icon?: React.ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  tone?: Tone;
  loading?: boolean;
  href?: string;
  className?: string;
}) {
  const accent =
    tone === "a"
      ? { bg: "var(--tone-a)", text: "text-[var(--tone-a)]" }
      : tone === "b"
      ? { bg: "var(--tone-b)", text: "text-[var(--tone-b)]" }
      : tone === "ink"
      ? { bg: "var(--ink)", text: "text-[var(--ink)]" }
      : { bg: "rgba(0,0,0,.08)", text: "text-foreground" };

  const content = (
    <div
      className={cn(
        "relative rounded-2xl border border-white/60 bg-[var(--panel)] p-5 transition-shadow",
        "shadow-[0_30px_60px_rgba(15,23,42,.08)_,_inset_0_1px_0_rgba(255,255,255,.6)]",
        "hover:shadow-[0_40px_70px_rgba(15,23,42,.10)_,_inset_0_1px_0_rgba(255,255,255,.6)]",
        className
      )}
    >
      {/* glossy corner light */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
           style={{ background: "radial-gradient(120% 70% at 120% -10%, rgba(255,255,255,.7), transparent 55%)" }} />

      {/* accent ribbon */}
      <div
        className="absolute inset-x-0 top-0 h-2 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accent.bg}, color-mix(in oklab, ${accent.bg} 50%, white))` }}
      />

      {/* header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-black/50">{title}</div>
        {icon && <div className="shrink-0 opacity-80">{icon}</div>}
      </div>

      {/* value */}
      <div className={cn("mt-2 text-3xl font-semibold tracking-tight leading-tight", accent.text)}>
        {loading ? <SkeletonLine className="h-8 w-32" /> : value}
        {unit && !loading && <span className="ml-1 text-base font-normal text-black/50">{unit}</span>}
      </div>

      {/* footer: delta + hint */}
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && !loading && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium",
              delta.direction === "up" ? "bg-emerald-50 text-emerald-700" :
              delta.direction === "down" ? "bg-rose-50 text-rose-700" :
              "bg-slate-50 text-slate-700"
            )}
          >
            {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "•"} {delta.value}
          </span>
        )}
        {hint && <span className="text-black/45">{hint}</span>}
      </div>
    </div>
  );

  return href ? (
    <a href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-2xl">
      {content}
    </a>
  ) : (
    content
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-black/10", className)} />;
}

// If you don’t have a cn helper yet, create src/lib/cn.ts:
// export function cn(...xs: (string | undefined | false)[]) { return xs.filter(Boolean).join(" "); }
