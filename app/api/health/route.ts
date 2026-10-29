import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok" });
  } catch (err) {
    logger.error("health check failed", { err });
    return NextResponse.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
