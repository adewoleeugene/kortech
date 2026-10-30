import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { authorizeFarmerPhotoDownload } from "@/lib/farmer/verification";

export const dynamic = "force-dynamic";

// Private farmer photos (farm, ID card, selfie): signed link + signed-in admin required.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const access = await authorizeFarmerPhotoDownload({
    user: await getCurrentUser(),
    photoId: id,
    expires: url.searchParams.get("expires"),
    sig: url.searchParams.get("sig"),
  });
  if (!access.ok) return NextResponse.json({ error: "not_allowed" }, { status: access.status });

  return new NextResponse(Buffer.from(access.bytes), {
    headers: {
      "content-type": access.contentType,
      "content-disposition": "inline",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
