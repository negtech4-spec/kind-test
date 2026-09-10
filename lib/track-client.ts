import {
  sanitizeAnalyticsMetadata,
  type AnalyticsMetadata,
  type EventType,
} from "@/lib/analytics";
import { fbPageView, fbTrack } from "@/lib/fbpixel";
import { marketingPixelConfig } from "@/lib/marketing-config";
import { getMarketingConsent } from "@/lib/marketing-consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Array<Record<string, unknown>>;
    ttq?: { page?: () => void; track?: (event: string, parameters?: Record<string, unknown>) => void };
    lintrk?: (event: string, parameters?: Record<string, unknown>) => void;
    uetq?: unknown[];
  }
}

const VISITOR_KEY = "kp_sid";
const VISIT_KEY = "kp_visit_id";
const ATTRIBUTION_KEY = "kp_visit_attribution_v1";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function storageId(storage: Storage, key: string) {
  let id = storage.getItem(key);
  if (!id) {
    id = createId();
    storage.setItem(key, id);
  }
  return id;
}

/** A durable anonymous browser id used for unique-visitor reporting. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    return storageId(window.localStorage, VISITOR_KEY);
  } catch {
    return "anonymous";
  }
}

/** A per-tab visit id used to separate visits from repeat visitors. */
export function getVisitId(): string {
  if (typeof window === "undefined") return "";
  try {
    return storageId(window.sessionStorage, VISIT_KEY);
  } catch {
    return getSessionId();
  }
}

function safeParam(params: URLSearchParams, name: string) {
  return params.get(name)?.trim() || undefined;
}

function externalReferrerHost() {
  try {
    if (!document.referrer) return undefined;
    const referrer = new URL(document.referrer);
    return referrer.host === window.location.host ? undefined : referrer.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

/** Keeps normal, non-UTM social traffic readable in the dashboard. */
function sourceFromReferrer(referrer: string | undefined) {
  if (!referrer) return undefined;
  const host = referrer.toLowerCase();
  if (/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(host)) return "facebook";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)linkedin\.com$/.test(host)) return "linkedin";
  if (/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/.test(host)) return "whatsapp";
  if (/(^|\.)google\./.test(host)) return "google";
  if (/(^|\.)x\.com$|(^|\.)twitter\.com$/.test(host)) return "x";
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)) return "youtube";
  return referrer;
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function incomingAttribution(): AnalyticsMetadata {
  const params = new URLSearchParams(window.location.search);
  const utmSource = safeParam(params, "utm_source");
  const referrer = externalReferrerHost();
  const linkCode = safeParam(params, "kp_link");
  return sanitizeAnalyticsMetadata({
    source: utmSource || sourceFromReferrer(referrer) || "direct",
    referrer,
    utmSource,
    utmMedium: safeParam(params, "utm_medium"),
    utmCampaign: safeParam(params, "utm_campaign"),
    utmTerm: safeParam(params, "utm_term"),
    utmContent: safeParam(params, "utm_content"),
    linkCode,
    landingPath: window.location.pathname,
  });
}

function hasInboundAttribution(metadata: AnalyticsMetadata) {
  return Boolean(metadata.utmSource || metadata.referrer || metadata.linkCode);
}

function readStoredAttribution() {
  try {
    const stored = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    return stored ? sanitizeAnalyticsMetadata(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

/** Attribution comes only from safe UTM values and the referrer hostname. */
export function getTrafficAttribution(): AnalyticsMetadata {
  if (typeof window === "undefined") return {};
  const incoming = incomingAttribution();
  const stored = readStoredAttribution();
  const attribution = hasInboundAttribution(incoming) || !stored ? incoming : stored;

  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Analytics should remain non-blocking when storage is unavailable.
  }

  return sanitizeAnalyticsMetadata({
    ...attribution,
    device: deviceType(),
    viewport: `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`,
  });
}

function postEvent(step: string, eventType: EventType, metadata: AnalyticsMetadata = {}) {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step,
        eventType,
        sessionId: getSessionId(),
        visitId: getVisitId(),
        path: window.location.pathname,
        metadata,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never interrupt a user completing the quiz.
  }
}

function trackMarketingPageView() {
  try {
    fbPageView();
    window.gtag?.("event", "page_view", { page_path: window.location.pathname });
    window.dataLayer?.push({
      event: "kindred_path_page_view",
      page_path: window.location.pathname,
    });
    window.ttq?.page?.();
  } catch {
    // Marketing tools are optional and may be blocked by the browser.
  }
}

/** Fire-and-forget interaction tracking. No quiz answer values are sent here. */
export function trackStep(step: string) {
  // Every first-party quiz action retains the original source/campaign. The
  // payload contains metadata only; it never contains answer text or contact details.
  postEvent(step, "action", getTrafficAttribution());
}

/** Tracks ordinary page traffic, source and device without query strings or PII. */
export function trackPageView() {
  postEvent("PageViewed", "page_view", getTrafficAttribution());
  trackMarketingPageView();
}

/**
 * Fires a real lead conversion only after the lead was saved successfully and
 * only when the visitor opted into marketing cookies. No consultation answers,
 * names, phone numbers, emails, or consultation type are shared with ad tools.
 */
export function trackMarketingLead() {
  if (typeof window === "undefined" || getMarketingConsent() !== "granted") return;
  try {
    fbTrack("Lead", { content_name: "Consultation request" });
    window.gtag?.("event", "generate_lead", { event_category: "engagement" });
    window.dataLayer?.push({ event: "kindred_path_lead" });

    if (
      marketingPixelConfig.googleAdsId &&
      marketingPixelConfig.googleAdsConversionLabel
    ) {
      window.gtag?.("event", "conversion", {
        send_to: `${marketingPixelConfig.googleAdsId}/${marketingPixelConfig.googleAdsConversionLabel}`,
      });
    }

    window.ttq?.track?.("SubmitForm");
    if (marketingPixelConfig.linkedInConversionId) {
      window.lintrk?.("track", {
        conversion_id: marketingPixelConfig.linkedInConversionId,
      });
    }
    window.uetq?.push("event", "generate_lead");
  } catch {
    // Optional advertising platforms must never interrupt a saved lead.
  }
}
