import { NextResponse } from "next/server";
import { readTrackingSettings } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Only public vendor identifiers are returned here. No API key, lead data,
 * quiz answer, or private admin setting is exposed to visitors.
 */
export async function GET() {
  return NextResponse.json(
    { settings: await readTrackingSettings() },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
  );
}
