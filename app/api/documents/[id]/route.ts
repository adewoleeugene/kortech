import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { authorizeDocumentDownload } from "@/lib/business/documents";

export const dynamic = "force-dynamic";

// Private verification documents: signed link + signed-in admin required.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const access = await authorizeDocumentDownload({
    user: await getCurrentUser(),
    documentId: id,
    expires: url.searchParams.get("expires"),
    sig: url.searchParams.get("sig"),
  });
  if (!access.ok) return NextResponse.json({ error: "not_allowed" }, { status: access.status });

  return new NextResponse(Buffer.from(access.bytes), {
    headers: {
      "content-type": access.contentType,
      "content-disposition": `inline; filename="${access.fileName.replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
