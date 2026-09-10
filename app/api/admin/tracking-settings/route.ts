import { NextResponse } from "next/server";
import { readTrackingSettings, updateTrackingSettings } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, settings: await readTrackingSettings() }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PATCH(req: Request) {
  try {
    const body: unknown = await req.json();
    const settings = await updateTrackingSettings(body);
    if (!settings) {
      return NextResponse.json(
        { ok: false, error: "Tracking settings could not be saved. Check Supabase and the latest schema." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false, error: "Tracking settings could not be read." }, { status: 400 });
  }
}
