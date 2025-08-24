"use client";

export function TopList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const top5 = items.slice(0, 5);

  return (
    <div className="card p-4">
      <div className="font-medium mb-3">{title}</div>
      <ol className="space-y-2">
        {top5.map((it, i) => (
          <li
            key={it.label + i}
            className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 border border-white/70"
          >
            <div className="flex items-center gap-3">
              <span className="pill">{i + 1}</span>
              <span className="font-medium">{it.label}</span>
            </div>
            <span className="text-sm text-black/60">{it.count.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
