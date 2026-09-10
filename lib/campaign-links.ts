export type CampaignLinkDraft = {
  label: string;
  source: string;
  medium: string;
  campaign: string;
  destination: "/" | "/quiz";
};

const DESTINATIONS = new Set(["/", "/quiz"]);
const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{2,39}$/;

function plainText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

/** Converts a channel/campaign value into a safe, conventional UTM token. */
export function campaignToken(value: unknown, maxLength = 80) {
  return plainText(value, maxLength)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

export function campaignLabel(value: unknown) {
  return plainText(value, 120);
}

export function normalizeCampaignDestination(value: unknown): "/" | "/quiz" | null {
  return typeof value === "string" && DESTINATIONS.has(value)
    ? (value as "/" | "/quiz")
    : null;
}

export function normalizeCampaignCode(value: unknown) {
  const code = campaignToken(value, 40);
  return CODE_PATTERN.test(code) ? code : null;
}

export function campaignPrefix(source: string) {
  const prefixes: Record<string, string> = {
    facebook: "fb",
    instagram: "ig",
    whatsapp: "wa",
    google: "gg",
    tiktok: "tt",
    linkedin: "li",
    qr: "qr",
    flyer: "qr",
    partner: "pt",
  };
  return prefixes[source] ?? "kp";
}

export function makeCampaignCode(source: string) {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  return `${campaignPrefix(source)}-${random}`;
}

export function parseCampaignLinkDraft(value: unknown): CampaignLinkDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const label = campaignLabel(record.label);
  const source = campaignToken(record.source, 40);
  const medium = campaignToken(record.medium, 40);
  const campaign = campaignToken(record.campaign, 100);
  const destination = normalizeCampaignDestination(record.destination);

  if (!label || !source || !medium || !campaign || !destination) return null;
  return { label, source, medium, campaign, destination };
}

export function buildCampaignDestination(link: {
  slug: string;
  source: string;
  medium: string;
  campaign: string;
  destination: string;
}) {
  const params = new URLSearchParams({
    utm_source: link.source,
    utm_medium: link.medium,
    utm_campaign: link.campaign,
    // The unique short-link code is the creative/placement identifier.
    utm_content: link.slug,
    kp_link: link.slug,
  });
  return `${link.destination}?${params.toString()}`;
}
