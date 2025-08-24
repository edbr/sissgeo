import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function GET() {
  try {
    const Bucket = process.env.S3_BUCKET!;
    const key = (process.env.S3_KEY || "latest.csv").replace(/\.csv$/i, ".json");
    const obj = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
    const buf = Buffer.from(await obj.Body!.transformToByteArray());
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60", // fast repeat loads
      },
    });
  } catch {
    return NextResponse.json({ error: "No summary yet. Run /api/refresh once." }, { status: 404 });
  }
}
