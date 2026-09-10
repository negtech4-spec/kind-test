export type EventType = "page_view" | "action";

export type AnalyticsMetadata = {
  source?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  /** A first-party campaign-link code such as `fb-a81d4`. Never contains PII. */
  linkCode?: string;
  /** Human-readable admin label for a campaign link. Never contains PII. */
  linkLabel?: string;
  device?: "mobile" | "tablet" | "desktop";
  viewport?: string;
  landingPath?: string;
};

export type LeadAttribution = {
  source: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  landingPath: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
  return clean || undefined;
}

function cleanPath(value: unknown) {
  const path = cleanText(value, 160);
  return path?.startsWith("/") ? path : undefined;
}

export function sanitizeAnalyticsMetadata(value: unknown): AnalyticsMetadata {
  if (!isRecord(value)) return {};

  const device = cleanText(value.device, 16);
  const viewport = cleanText(value.viewport, 20);
  return {
    source: cleanText(value.source, 80),
    referrer: cleanText(value.referrer, 120),
    utmSource: cleanText(value.utmSource, 120),
    utmMedium: cleanText(value.utmMedium, 120),
    utmCampaign: cleanText(value.utmCampaign, 160),
    utmTerm: cleanText(value.utmTerm, 160),
    utmContent: cleanText(value.utmContent, 160),
    linkCode: cleanText(value.linkCode, 60),
    linkLabel: cleanText(value.linkLabel, 120),
    device:
      device === "mobile" || device === "tablet" || device === "desktop" ? device : undefined,
    viewport: viewport && /^\d{2,5}x\d{2,5}$/.test(viewport) ? viewport : undefined,
    landingPath: cleanPath(value.landingPath),
  };
}

export function toLeadAttribution(value: unknown): LeadAttribution {
  const metadata = sanitizeAnalyticsMetadata(value);
  return {
    source: metadata.source ?? null,
    referrer: metadata.referrer ?? null,
    utmSource: metadata.utmSource ?? null,
    utmMedium: metadata.utmMedium ?? null,
    utmCampaign: metadata.utmCampaign ?? null,
    utmTerm: metadata.utmTerm ?? null,
    utmContent: metadata.utmContent ?? null,
    landingPath: metadata.landingPath ?? null,
  };
}
