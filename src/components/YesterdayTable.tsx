"use client";

import * as React from "react";

type Entry = Record<
  | "Id Registro"
  | "Data Observacao"
  | "Tipo Animal"
  | "Nome científico"
  | "Status Validação"
  | "Estado"
  | "Município",
  string
>;

export function YesterdayTable() {
  const [entries, setEntries] = React.useState<Entry[]>([]);

  React.useEffect(() => {
    fetch("/api/entries")
      .then((res) => res.json())
      .then(setEntries)
      .catch((err) => console.error("Failed to load entries", err));
  }, []);

  // --- CSV exporter ---
  function downloadCSV() {
    if (!entries.length) return;

    const headers: (keyof Entry)[] = [
      "Id Registro",
      "Data Observacao",
      "Tipo Animal",
      "Nome científico",
      "Status Validação",
      "Estado",
      "Município",
    ];

    const rows = entries.map((e) =>
      headers
        .map((h) => {
          const val = e[h] ?? "";
          return `"${val.replace(/"/g, '""')}"`
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "yesterday-entries.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!entries.length) {
    return <p>No entries found for yesterday.</p>;
  }

  return (
    <div className="mt-8">
      {/* Download button */}
      <div className="mb-2 flex justify-end">
        <button
          onClick={downloadCSV}
          className="rounded bg-[var(--tone-b)] text-white px-3 py-1 text-sm hover:opacity-90"
        >
          Download CSV
        </button>
      </div>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Data</th>
            <th className="p-2 border">Tipo Animal</th>
            <th className="p-2 border">Nome científico</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Estado</th>
            <th className="p-2 border">Município</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e["Id Registro"]}>
              <td className="p-2 border">{e["Data Observacao"]}</td>
              <td className="p-2 border">{e["Tipo Animal"]}</td>
              <td className="p-2 border">{e["Nome científico"]}</td>
              <td className="p-2 border">{e["Status Validação"]}</td>
              <td className="p-2 border">{e.Estado}</td>
              <td className="p-2 border">{e["Município"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
