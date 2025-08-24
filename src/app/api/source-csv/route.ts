import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = "https://sissgeo.lncc.br";
const PATH = "/mapaRegistrosInicial.xhtml";
const URL = BASE + PATH;

// Helpers
function pickHidden(name: string, html: string) {
  const m = html.match(
    new RegExp(`<input[^>]*name=["']${name}["'][^>]*value=["']([^"']*)["']`, "i")
  );
  return m?.[1] ?? "";
}
function pickFormId(html: string) {
  // default known form id used on that page
  const known = /<form[^>]*id=["']formDadosNoMapa["']/i.test(html);
  if (known) return "formDadosNoMapa";
  // fallback: grab first form id
  const m = html.match(/<form[^>]*id=["']([^"']+)["']/i);
  return m?.[1] ?? "formDadosNoMapa";
}

export async function GET() {
  try {
    // 1) Initial GET to grab cookies + view state
    const initRes = await fetch(URL, { method: "GET" });
    if (!initRes.ok) {
      return NextResponse.json(
        { error: "Initial GET failed", status: initRes.status },
        { status: 502 }
      );
    }
    const setCookie = initRes.headers.get("set-cookie") || "";
    const html = await initRes.text();

    const viewState = pickHidden("javax.faces.ViewState", html);
    if (!viewState) {
      return NextResponse.json(
        { error: "ViewState not found" },
        { status: 500 }
      );
    }
    const FORM = pickFormId(html);

    // the export link id seen on this page (from your snippet)
    const BUTTON = "j_idt264";

    // 2) Non-AJAX POST (PrimeFaces file downloads are typically non-AJAX)
    const formBody = new URLSearchParams({
      [FORM]: FORM,
      [BUTTON]: BUTTON,
      "javax.faces.ViewState": viewState,
    });

    const postRes = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Referer": URL,
        ...(setCookie ? { Cookie: setCookie } : {}),
      },
      body: formBody.toString(),
    });

    // If server returns the file, content-type should be csv / octet-stream and/or disposition=attachment
    const ct = postRes.headers.get("content-type") || "";
    const disp = postRes.headers.get("content-disposition") || "";
    const okType =
      /csv|octet-stream|excel/i.test(ct) || /attachment/i.test(disp);

    if (!postRes.ok || !okType) {
      // Try to show useful snippet to debug
      const maybeText =
        ct.includes("text") || ct.includes("html")
          ? (await postRes.text()).slice(0, 2000)
          : null;
      return NextResponse.json(
        {
          error: "Export POST failed or not a CSV",
          status: postRes.status,
          contentType: ct,
          contentDisposition: disp,
          snippet: maybeText,
        },
        { status: 502 }
      );
    }

    const buf = Buffer.from(await postRes.arrayBuffer());
    // Stream CSV back to the client
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct || "text/csv; charset=utf-8",
        "Content-Disposition":
          disp || 'inline; filename="sissgeo.csv"',
        "Cache-Control": "no-store",
      },
    });
} catch (e: unknown) {
  const msg =
    typeof e === "object" && e !== null && "message" in e
      ? String((e as { message?: unknown }).message)
      : "source proxy failed";
  return NextResponse.json({ error: msg }, { status: 500 });
}
}
