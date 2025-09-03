import { NextResponse } from "next/server";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

type Entry = {
  "Id Registro": string;
  "Data Observacao": string;
  "Tipo Animal": string;
  "Nome científico": string;
  "Nível Taxonômico": string;
  "Status Validação": string;
  Estado: string;
  Município: string;
  Latitude: string;
  Longitude: string;
};

export async function GET() {
  try {
    const r = await fetch(process.env.NEXT_PUBLIC_JSON_URL!);
    const raw = await r.json();

    const data: Entry[] = raw.rows ?? [];
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

    const filtered = data.filter((row) => {
      const obsDate = dayjs(row["Data Observacao"], "DD/MM/YYYY HH:mm:ss");
      return obsDate.format("YYYY-MM-DD") === yesterday;
    });

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("entries api failed", err);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
