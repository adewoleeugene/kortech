import { NextResponse } from "next/server";
import { captureException } from "@/lib/adapters/error-tracking";
import { clientErrorSchema } from "@/lib/observability/client-error";

export async function POST(request: Request) {
  const parsed = clientErrorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { message, ...context } = parsed.data;
  captureException(new Error(message), { source: "client", ...context });
  return new NextResponse(null, { status: 204 });
}
