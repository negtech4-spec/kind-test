export type TrackingSettings = {
  metaPixelId: string;
  googleTagManagerId: string;
  ga4MeasurementId: string;
  googleAdsId: string;
  googleAdsConversionLabel: string;
  tiktokPixelId: string;
  linkedInPartnerId: string;
  linkedInConversionId: string;
  microsoftUetTagId: string;
  clarityProjectId: string;
  updatedAt: number;
};

export const EMPTY_TRACKING_SETTINGS: TrackingSettings = {
  metaPixelId: "",
  googleTagManagerId: "",
  ga4MeasurementId: "",
  googleAdsId: "",
  googleAdsConversionLabel: "",
  tiktokPixelId: "",
  linkedInPartnerId: "",
  linkedInConversionId: "",
  microsoftUetTagId: "",
  clarityProjectId: "",
  updatedAt: 0,
};

const SETTING_KEYS = [
  "metaPixelId",
  "googleTagManagerId",
  "ga4MeasurementId",
  "googleAdsId",
  "googleAdsConversionLabel",
  "tiktokPixelId",
  "linkedInPartnerId",
  "linkedInConversionId",
  "microsoftUetTagId",
  "clarityProjectId",
] as const;

export type TrackingSettingKey = (typeof SETTING_KEYS)[number];

function cleanIdentifier(value: unknown, maxLength = 120) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, maxLength);
}

/** Keeps public tracking identifiers safe to render inside a script URL/snippet. */
export function sanitizeTrackingSettings(value: unknown): TrackingSettings {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const settings = { ...EMPTY_TRACKING_SETTINGS };
  for (const key of SETTING_KEYS) {
    settings[key] = cleanIdentifier(input[key]);
  }
  settings.updatedAt = Number(input.updatedAt) || 0;
  return settings;
}

/**
 * Accepts an official vendor tag snippet and extracts recognised public IDs.
 * The application deliberately does not execute arbitrary pasted JavaScript.
 */
export function parseTrackingSnippet(value: string): Partial<TrackingSettings> {
  const text = value.trim();
  if (!text) return {};
  const found: Partial<TrackingSettings> = {};
  const first = (pattern: RegExp) => text.match(pattern)?.[1];

  const meta = first(/fbq\(\s*["']init["']\s*,\s*["']?(\d{5,20})/i)
    ?? first(/facebook\.com\/tr\/?\?[^"'\s>]*\bid=(\d{5,20})/i);
  const gtm = first(/\b(GTM-[A-Z0-9]+)\b/i);
  const ga4 = first(/\b(G-[A-Z0-9]{5,})\b/i);
  const googleAds = first(/\b(AW-\d{4,})\b/i);
  const googleAdsLabel = first(/send_to\s*[:=]\s*["']AW-\d+\/([A-Za-z0-9_-]+)/i);
  const tiktok = first(/ttq\.load\(\s*["']([^"']+)/i);
  const linkedInPartner = first(/_linkedin_partner_id\s*=\s*["']?(\d+)/i);
  const linkedInConversion = first(/conversion_id\s*[:=]\s*["']?(\d+)/i);
  const microsoftUet = first(/\bti\s*:\s*["']?(\d{4,})/i);
  const clarity = first(/clarity\.ms\/tag\/([A-Za-z0-9]+)/i);

  if (meta) found.metaPixelId = cleanIdentifier(meta);
  if (gtm) found.googleTagManagerId = cleanIdentifier(gtm);
  if (ga4) found.ga4MeasurementId = cleanIdentifier(ga4);
  if (googleAds) found.googleAdsId = cleanIdentifier(googleAds);
  if (googleAdsLabel) found.googleAdsConversionLabel = cleanIdentifier(googleAdsLabel);
  if (tiktok) found.tiktokPixelId = cleanIdentifier(tiktok);
  if (linkedInPartner) found.linkedInPartnerId = cleanIdentifier(linkedInPartner);
  if (linkedInConversion) found.linkedInConversionId = cleanIdentifier(linkedInConversion);
  if (microsoftUet) found.microsoftUetTagId = cleanIdentifier(microsoftUet);
  if (clarity) found.clarityProjectId = cleanIdentifier(clarity);
  return found;
}

export function configuredTrackingTools(settings: TrackingSettings) {
  return [
    settings.metaPixelId,
    settings.googleTagManagerId,
    settings.ga4MeasurementId,
    settings.googleAdsId,
    settings.tiktokPixelId,
    settings.linkedInPartnerId,
    settings.microsoftUetTagId,
    settings.clarityProjectId,
  ].filter(Boolean).length;
}
