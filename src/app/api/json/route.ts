export const runtime = "nodejs"; // or "edge" if you prefer

export async function GET() {
  const url = process.env.JSON_URL!; // note: server-only env
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream HTTP ${r.status}` }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }
    const body = await r.text();
    return new Response(body, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: unknown) {
    // e is unknown, so narrow it safely
    const message =
      e instanceof Error ? e.message : "Unknown error fetching JSON";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

