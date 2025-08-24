import { NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      : undefined,
});

function hasTransformToWebStream(
  x: unknown
): x is { transformToWebStream: () => ReadableStream } {
  return typeof x === "object" && x !== null && "transformToWebStream" in x;
}

export async function GET() {
  try {
    const Bucket = process.env.S3_BUCKET!;
    const Key = process.env.S3_KEY || "sissgeo/latest.csv";
    if (!Bucket) {
      return NextResponse.json({ error: "Missing S3_BUCKET" }, { status: 500 });
    }

    const result: GetObjectCommandOutput = await s3.send(
      new GetObjectCommand({ Bucket, Key })
    );

    const filename = Key.split("/").pop() || "latest.csv";
    const contentType = result.ContentType || "text/csv; charset=utf-8";
    const body = result.Body;

    // If AWS SDK exposes a Web stream, use it directly (types align)
    if (body && hasTransformToWebStream(body)) {
      return new NextResponse(body.transformToWebStream(), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename}"`,
        },
      });
    }

    // Otherwise: buffer the body (works across runtimes)
    if (!body) {
      return NextResponse.json({ error: "Empty S3 object body" }, { status: 500 });
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);

    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Failed to read CSV from S3";
    const status =
      typeof err === "object" && err !== null && "$metadata" in err
        ? Number(
            (err as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode
          ) || 500
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
