import { EMPTY_TRACKING_SETTINGS, type TrackingSettings } from "@/lib/tracking-settings";

function cleanId(value: string | undefined) {
  return (value ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "");
}

function cleanConversionLabel(value: string | undefined) {
  return (value ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "");
}

/** Environment values are a safe fallback; admin-managed IDs take precedence at runtime. */
export const marketingPixelConfig: TrackingSettings = {
  ...EMPTY_TRACKING_SETTINGS,
  metaPixelId: cleanId(process.env.NEXT_PUBLIC_FB_PIXEL_ID),
  googleTagManagerId: cleanId(process.env.NEXT_PUBLIC_GTM_ID),
  ga4MeasurementId: cleanId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
  googleAdsId: cleanId(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID),
  googleAdsConversionLabel: cleanConversionLabel(
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL
  ),
  tiktokPixelId: cleanId(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID),
  linkedInPartnerId: cleanId(process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID),
  linkedInConversionId: cleanConversionLabel(
    process.env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID
  ),
  microsoftUetTagId: cleanId(process.env.NEXT_PUBLIC_MICROSOFT_UET_TAG_ID),
  clarityProjectId: cleanId(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID),
};

export const hasMarketingPixels = [
  marketingPixelConfig.metaPixelId,
  marketingPixelConfig.googleTagManagerId,
  marketingPixelConfig.ga4MeasurementId,
  marketingPixelConfig.googleAdsId,
  marketingPixelConfig.tiktokPixelId,
  marketingPixelConfig.linkedInPartnerId,
  marketingPixelConfig.microsoftUetTagId,
  marketingPixelConfig.clarityProjectId,
].some(Boolean);
