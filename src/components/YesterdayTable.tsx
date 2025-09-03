"use client";

import * as React from "react";

type Entry = {
  ["Id Registro"]: string;
  ["Data Observacao"]: string;
  ["Tipo Animal"]: string;
  ["Nome científico"]: string;
  ["Status Validação"]: string;
  Estado: string;
  Município: string;
};

export function YesterdayTable() {
  const [entries, setEntries] = React.useState<Entry[]>([]);

  React.useEffect(() => {
    fetch("/api/entries")
      .then((res) => res.json())
      .then(setEntries)
      .catch((err) => console.error("Failed to load entries", err));
  }, []);

  if (!entries.length) {
    return <p>No entries found for yesterday.</p>;
  }

  return (
    <table className="min-w-full border mt-8 text-sm">
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
  );
}
