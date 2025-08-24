import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// 1) Small helper to extract hidden inputs from the HTML:
function getHidden(name: string, html: string) {
  const m = html.match(new RegExp(
    `<input[^>]*name=["']${name}["'][^>]*value=["']([^"']+)["']`,
    "i"
  ));
  return m?.[1] ?? "";
}

export async function GET() {
  const BASE = "https://sissgeo.lncc.br";
  const PATH = "/mapaRegistrosInicial.xhtml";
  const url = BASE + PATH;

  // Keep cookies between requests
  let cookies = "";

  // 2) Fetch page (capture cookies + ViewState)
  const pageRes = await fetch(url, { method: "GET" });
  if (!pageRes.ok) {
    return NextResponse.json({ error: "Failed initial GET" }, { status: 502 });
  }
  const setCookie = pageRes.headers.get("set-cookie");
  if (setCookie) cookies = setCookie;
  const html = await pageRes.text();

  // Typically:
  // - form id/name from your snippet: "formDadosNoMapa"
  // - export button id looked like "j_idt264"
  const FORM = "formDadosNoMapa";
  const BUTTON = "j_idt264";

  const viewState = getHidden("javax.faces.ViewState", html);
  if (!viewState) {
    return NextResponse.json({ error: "ViewState not found" }, { status: 500 });
  }

  // 3) Build the POST body as a standard JSF form submit
  // NOTE: Many PrimeFaces exports are *non-AJAX* submits (no javax.faces.partial.ajax)
  const body = new URLSearchParams({
    // the form name/id must be posted with any value (often the form id itself)
    [FORM]: FORM,
    // trigger the action by sending the link/button id param
    [BUTTON]: BUTTON,
    // include the view state
    "javax.faces.ViewState": viewState,
  });

  const postRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookies ? { "Cookie": cookies } : {}),
    },
    body: body.toString(),
  });

  if (!postRes.ok) {
    return NextResponse.json({ error: "Export POST failed" }, { status: 502 });
  }

  // 4) The response should be the CSV file (check Content-Disposition / type)
  const contentType = postRes.headers.get("content-type") || "";
  const buf = Buffer.from(await postRes.arrayBuffer());

  // (Optional) Save to S3
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: "sissgeo/latest.csv",
    Body: buf,
    ContentType: contentType || "text/csv",
    CacheControl: "public, max-age=0, must-revalidate",
  }));

  return NextResponse.json({ ok: true, bytes: buf.length, contentType });
}
