// src/components/TopStatesMap.tsx
"use client";

import * as React from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature as topoToGeo } from "topojson-client";
import type { Topology, Objects } from "topojson-specification";
import { scaleLinear } from "d3-scale";
import type { Feature, FeatureCollection, Geometry } from "geojson";

type Item = { state: string; count: number };
const GEO_URL = "/maps/br-states.json";

// canon: remove accents, lowercase, collapse spaces
const canon = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

type GeoStateProps = { nome?: string; name?: string; NAME_1?: string; UF?: string; estado?: string };
type GeoFC = FeatureCollection<Geometry, GeoStateProps>;
type GeoF = Feature<Geometry, GeoStateProps>;

export function TopStatesMap({
  data,
  title = "Most active states",
  width = 640,
  height = 420,
}: {
  data: Item[];
  title?: string;
  width?: number;
  height?: number;
}) {
  const [fc, setFc] = React.useState<GeoFC | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch(GEO_URL);
      if (!res.ok) return;
      const raw: unknown = await res.json();

      let geo: GeoFC;
      if ((raw as Topology).type === "Topology") {
        const topo = raw as Topology;
        const objects = topo.objects as Objects<GeoStateProps>;
        const firstKey = Object.keys(objects)[0];
        const obj = objects[firstKey];
        const out = topoToGeo(topo, obj) as GeoFC | GeoF;
        geo =
          (out as GeoFC).type === "FeatureCollection"
            ? (out as GeoFC)
            : ({ type: "FeatureCollection", features: [out as GeoF] } as GeoFC);
      } else if ((raw as GeoFC).type === "FeatureCollection") {
        geo = raw as GeoFC;
      } else if ((raw as GeoF).type === "Feature") {
        geo = { type: "FeatureCollection", features: [raw as GeoF] };
      } else return;
      if (mounted) setFc(geo);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const counts = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const it of data || []) {
      const key = canon(it.state);
      m.set(key, (m.get(key) || 0) + it.count);
    }
    return m;
  }, [data]);

  const max = React.useMemo(() => Math.max(1, ...counts.values()), [counts]);

  const brand =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--tone-b").trim() || "#2E6B5E"
      : "#2E6B5E";

  const color = React.useMemo(
    () => scaleLinear<string>().domain([0, max]).range(["#E6EFEA", brand]),
    [max, brand]
  );

  const pathGen = React.useMemo(() => {
    if (!fc) return null;
    const proj = geoMercator().fitSize([width, height], fc);
    return geoPath(proj);
  }, [fc, width, height]);

  const [hoverKey, setHoverKey] = React.useState<string | null>(null);
  const [tip, setTip] = React.useState<{ x: number; y: number; name: string; value: number } | null>(null);

  function placeTip(clientX: number, clientY: number, name: string, value: number) {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 12;
    let x = clientX - rect.left + pad;
    let y = clientY - rect.top + pad;
    x = Math.max(pad, Math.min(x, rect.width - 160));
    y = Math.max(pad, Math.min(y, rect.height - 60));
    setTip({ x, y, name, value });
  }

  return (
    <div ref={wrapRef} className="card p-4 relative">
      <div className="font-medium mb-3">{title}</div>
      <div className="w-full overflow-hidden">
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMinYMin meet"
          role="img"
          aria-label={title}
        >
          <rect x="0" y="0" width={width} height={height} fill="transparent" />
          {fc &&
            pathGen &&
            fc.features.map((f, i) => {
              const props = f.properties ?? {};
              const rawName =
                props.nome ||
                props.name ||
                props.NAME_1 ||
                props.estado ||
                (typeof f.id === "string" ? f.id : "") ||
                "";
              const key = canon(String(rawName));
              const val = counts.get(key) || 0;

              const isHover = hoverKey === key;
              const baseFill = color(val);
              const hoverFill = "var(--map-hover)";
              const stroke = isHover ? brand : "#9BA5A1";
              const strokeWidth = isHover ? 1.2 : 0.6;

              return (
                <path
                  key={i}
                  d={pathGen(f) ?? undefined}
                  fill={isHover ? hoverFill : baseFill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  tabIndex={0}
                  aria-label={`${rawName}: ${val} entries`}
                  onMouseEnter={(e) => {
                    setHoverKey(key);
                    placeTip(e.clientX, e.clientY, String(rawName), val);
                  }}
                  onMouseMove={(e) => placeTip(e.clientX, e.clientY, String(rawName), val)}
                  onMouseLeave={() => {
                    setHoverKey(null);
                    setTip(null);
                  }}
                  onFocus={(e) => {
                    setHoverKey(key);
                    const bbox = (e.target as SVGPathElement).getBoundingClientRect();
                    placeTip(bbox.left + bbox.width / 2, bbox.top, String(rawName), val);
                  }}
                  onBlur={() => {
                    setHoverKey(null);
                    setTip(null);
                  }}
                  style={{ cursor: "pointer", transition: "fill .15s ease, stroke .15s ease" }}
                >
                  <title>{`${rawName} • ${val.toLocaleString()} entries`}</title>
                </path>
              );
            })}
        </svg>
      </div>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-white/95 shadow p-2 text-xs border"
          style={{ left: tip.x, top: tip.y, minWidth: 140 }}
        >
          <div className="font-medium">{tip.name}</div>
          <div>{tip.value.toLocaleString()} submissions</div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-black/60">
        <span>Fewer</span>
        <div
          className="h-2 w-16 rounded"
          style={{ background: `linear-gradient(90deg, ${color(0)}, ${color(max)})` }}
        />
        <span>More</span>
      </div>
    </div>
  );
}
