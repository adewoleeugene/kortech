import { NextResponse } from "next/server";
import { getPublicMediaStorage } from "@/lib/adapters/storage";

// Public listing photos. Keys contain a random part and never change, so they cache forever.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!key.startsWith("listing-photos/")) return new NextResponse(null, { status: 404 });

  const file = await getPublicMediaStorage().get(key).catch(() => null);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "content-type": file.contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
