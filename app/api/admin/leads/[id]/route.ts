import { NextResponse } from "next/server";
import { LEAD_STATUSES, updateLead, type LeadStatus } from "@/lib/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid lead update." }, { status: 400 });
    }
    const values = body as Record<string, unknown>;
    const status = values.status;
    if (typeof status !== "string" || !(LEAD_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ ok: false, error: "Choose a valid follow-up status." }, { status: 400 });
    }

    const { id } = await params;
    const lead = await updateLead(id, {
      status: status as LeadStatus,
      adminNote: typeof values.adminNote === "string" ? values.adminNote : null,
      followUpAt: values.followUpAt === null || values.followUpAt === "" ? null : Number(values.followUpAt),
    });
    if (!lead) {
      return NextResponse.json(
        { ok: false, error: "The lead could not be updated. Check Supabase and the latest schema, then try again." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, lead });
  } catch {
    return NextResponse.json({ ok: false, error: "The lead update could not be read." }, { status: 400 });
  }
}
