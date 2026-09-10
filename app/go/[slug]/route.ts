import { NextResponse } from "next/server";
import { buildCampaignDestination, normalizeCampaignCode } from "@/lib/campaign-links";
import { findCampaignLink, appendEvent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const protocol = (req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "")).split(",")[0];
  return host ? `${protocol}://${host}` : new URL(req.url).origin;
}

/**
 * Public, safe redirect for admin-created campaign links. The destination is
 * stored server-side and restricted to the quiz landing or quiz itself, so this
 * cannot be used as an open redirect. The click is tracked even when the
 * visitor blocks browser scripts; the landing page then records the visit and
 * later progress under the same link code.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = normalizeCampaignCode(rawSlug);
  const origin = redirectOrigin(req);
  const fallback = new URL("/", origin);
  if (!slug) return NextResponse.redirect(fallback, 307);

  const link = await findCampaignLink(slug);
  if (!link) return NextResponse.redirect(fallback, 307);

  const clickId = crypto.randomUUID();
  await appendEvent({
    id: clickId,
    sessionId: `redirect-${clickId}`,
    visitId: `click-${clickId}`,
    step: "CampaignLinkClicked",
    eventType: "action",
    path: `/go/${link.slug}`,
    metadata: {
      source: link.source,
      utmSource: link.source,
      utmMedium: link.medium,
      utmCampaign: link.campaign,
      utmContent: link.slug,
      linkCode: link.slug,
      linkLabel: link.label,
      landingPath: link.destination,
    },
    timestamp: Date.now(),
  });

  const destination = new URL(buildCampaignDestination(link), origin);
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
