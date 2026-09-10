import { NextResponse } from "next/server";
import {
  makeCampaignCode,
  normalizeCampaignCode,
  parseCampaignLinkDraft,
} from "@/lib/campaign-links";
import {
  createCampaignLink,
  readCampaignLinks,
  type CampaignLink,
} from "@/lib/store";

export const runtime = "nodejs";

/**
 * Creates one private, first-party tracking redirect. This route is protected
 * by middleware, so a public visitor can never create or inspect campaign links.
 */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const draft = parseCampaignLinkDraft(body);
    if (!draft) {
      return NextResponse.json(
        { ok: false, error: "Add a link name, channel, medium, campaign and destination." },
        { status: 400 }
      );
    }

    const requestedCode =
      body && typeof body === "object" && !Array.isArray(body)
        ? normalizeCampaignCode((body as Record<string, unknown>).code)
        : null;
    const existing = await readCampaignLinks();
    const taken = new Set(existing.map((link) => link.slug));
    let slug = requestedCode;

    if (slug && taken.has(slug)) {
      return NextResponse.json(
        { ok: false, error: "That short code is already in use. Choose another one." },
        { status: 409 }
      );
    }

    if (!slug) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = makeCampaignCode(draft.source);
        if (!taken.has(candidate)) {
          slug = candidate;
          break;
        }
      }
    }

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "We could not create a unique short code. Please try again." },
        { status: 503 }
      );
    }

    const link: CampaignLink = {
      id: crypto.randomUUID(),
      slug,
      ...draft,
      createdAt: Date.now(),
    };
    const saved = await createCampaignLink(link);
    if (!saved) {
      return NextResponse.json(
        { ok: false, error: "The link was not saved. Check Supabase, then try again." },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, link });
  } catch {
    return NextResponse.json({ ok: false, error: "We could not create that link." }, { status: 400 });
  }
}
