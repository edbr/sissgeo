import { NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! }
    : undefined,
});

export async function GET() {
  const Bucket = process.env.S3_BUCKET!;
  const Key = process.env.S3_KEY || "sissgeo/latest.csv";
  if (!Bucket) return NextResponse.json({ error: "Missing S3_BUCKET" }, { status: 500 });

  const now = new Date().toISOString();
  const body = `id,name,when\n1,hello-world,"${now}"\n`;

  await s3.send(new PutObjectCommand({
    Bucket, Key, Body: body, ContentType: "text/csv; charset=utf-8", CacheControl: "no-cache",
  }));

  return NextResponse.json({ ok: true, Bucket, Key, bytes: body.length });
}
