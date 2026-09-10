import fs from "fs";
import path from "path";
import {
  sanitizeAnalyticsMetadata,
  type AnalyticsMetadata,
  type EventType,
  type LeadAttribution,
} from "@/lib/analytics";
import {
  EMPTY_TRACKING_SETTINGS,
  sanitizeTrackingSettings,
  type TrackingSettings,
} from "@/lib/tracking-settings";

export type QuizEvent = {
  id: string;
  sessionId: string;
  visitId: string;
  step: string;
  eventType: EventType;
  path: string;
  metadata: AnalyticsMetadata;
  timestamp: number;
};

export type Lead = {
  id: string;
  sessionId: string;
  fullName: string;
  phone: string;
  email: string | null;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  q4: string | null;
  consultationType: "in_person" | "remote";
  source: LeadAttribution["source"];
  referrer: LeadAttribution["referrer"];
  utmSource: LeadAttribution["utmSource"];
  utmMedium: LeadAttribution["utmMedium"];
  utmCampaign: LeadAttribution["utmCampaign"];
  utmTerm: LeadAttribution["utmTerm"];
  utmContent: LeadAttribution["utmContent"];
  landingPath: LeadAttribution["landingPath"];
  /** Internal workflow fields. They never leave the protected admin area. */
  status: LeadStatus;
  adminNote: string | null;
  followUpAt: number | null;
  updatedAt: number;
  timestamp: number;
};

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "consultation_scheduled",
  "consultation_booked",
  "nurture",
  "closed",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadUpdate = Pick<Lead, "status" | "adminNote" | "followUpAt">;

/** A private, first-party redirect link created inside the admin dashboard. */
export type CampaignLink = {
  id: string;
  slug: string;
  label: string;
  source: string;
  medium: string;
  campaign: string;
  destination: "/" | "/quiz";
  createdAt: number;
};

export type StoreStatus = "supabase" | "file" | "setup-required";

const DATA_DIR = path.join(process.cwd(), "data");
const MAX_EVENTS = 25_000;
const MAX_LEADS = 10_000;
const MAX_CAMPAIGN_LINKS = 2_000;
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
// Supabase's newer sb_secret_ key is preferred. The legacy service-role key
// remains supported so an existing deployment does not break during upgrade.
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
type DataFile =
  | "events.json"
  | "leads.json"
  | "campaign-links.json"
  | "tracking-settings.json";

type DbEvent = {
  id: string;
  session_id: string;
  visit_id: string | null;
  step: string;
  event_type: EventType | null;
  path: string;
  metadata: unknown;
  timestamp: number;
};

type DbLead = {
  id: string;
  session_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  q4: string | null;
  consultation_type: "in_person" | "remote";
  source: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_path: string | null;
  status: LeadStatus | null;
  admin_note: string | null;
  follow_up_at: number | null;
  updated_at: number | null;
  timestamp: number;
};

type DbTrackingSettings = {
  id: string;
  meta_pixel_id: string | null;
  google_tag_manager_id: string | null;
  ga4_measurement_id: string | null;
  google_ads_id: string | null;
  google_ads_conversion_label: string | null;
  tiktok_pixel_id: string | null;
  linkedin_partner_id: string | null;
  linkedin_conversion_id: string | null;
  microsoft_uet_tag_id: string | null;
  clarity_project_id: string | null;
  updated_at: number | null;
};

type DbCampaignLink = {
  id: string;
  slug: string;
  label: string;
  source: string;
  medium: string;
  campaign: string;
  destination: string;
  created_at: number;
};

function isServerless() {
  return Boolean(
    process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FUNCTIONS_WORKER_RUNTIME
  );
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVER_KEY);
}

export function getStoreStatus(): StoreStatus {
  if (hasSupabaseConfig()) return "supabase";
  if (SUPABASE_URL || SUPABASE_SERVER_KEY || isServerless()) return "setup-required";
  return "file";
}

function readFile<T>(name: DataFile): T[] {
  try {
    const file = path.join(DATA_DIR, name);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
    const data: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? (data as T[]) : [];
  } catch (error) {
    console.error("Kindred Path file store read failed:", error);
    return [];
  }
}

function appendFile<T>(name: DataFile, record: T, limit: number) {
  try {
    const file = path.join(DATA_DIR, name);
    const records = readFile<T>(name);
    records.push(record);
    fs.writeFileSync(file, JSON.stringify(records.slice(-limit)), "utf8");
    return true;
  } catch (error) {
    console.error("Kindred Path file store write failed:", error);
    return false;
  }
}

function writeFile<T>(name: DataFile, records: T[]) {
  try {
    const file = path.join(DATA_DIR, name);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(records), "utf8");
    return true;
  } catch (error) {
    console.error("Kindred Path file store update failed:", error);
    return false;
  }
}

async function supabaseRequest(pathname: string, init: RequestInit) {
  if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) return null;

  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
      ...init,
      cache: "no-store",
      headers: {
        // `apikey` accepts both Supabase's current `sb_secret_…` keys and
        // legacy service-role JWTs. Do not send an sb_secret_ key as Bearer.
        apikey: SUPABASE_SERVER_KEY,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    console.error("Kindred Path Supabase request failed:", error);
    return null;
  }
}

async function logSupabaseFailure(operation: string, response: Response | null) {
  if (!response || response.ok) return;
  let detail = "";
  try {
    detail = (await response.text()).replace(/\s+/g, " ").slice(0, 500);
  } catch {
    // The status is still useful if a response body cannot be read.
  }
  console.error(`Kindred Path Supabase ${operation} failed (${response.status})${detail ? `: ${detail}` : ""}`);
}

function normalizeEvent(event: Partial<QuizEvent>): QuizEvent {
  return {
    id: typeof event.id === "string" ? event.id : crypto.randomUUID(),
    sessionId: typeof event.sessionId === "string" ? event.sessionId : "unknown",
    visitId:
      typeof event.visitId === "string" && event.visitId ? event.visitId : event.sessionId ?? "legacy",
    step: typeof event.step === "string" ? event.step : "UnknownAction",
    eventType: event.eventType === "page_view" ? "page_view" : "action",
    path: typeof event.path === "string" ? event.path : "",
    metadata: sanitizeAnalyticsMetadata(event.metadata),
    timestamp: Number(event.timestamp) || 0,
  };
}

function toDbEvent(event: QuizEvent): DbEvent {
  return {
    id: event.id,
    session_id: event.sessionId,
    visit_id: event.visitId,
    step: event.step,
    event_type: event.eventType,
    path: event.path,
    metadata: event.metadata,
    timestamp: event.timestamp,
  };
}

function fromDbEvent(event: DbEvent): QuizEvent {
  return normalizeEvent({
    id: event.id,
    sessionId: event.session_id,
    visitId: event.visit_id ?? event.session_id,
    step: event.step,
    eventType: event.event_type ?? "action",
    path: event.path,
    metadata: sanitizeAnalyticsMetadata(event.metadata),
    timestamp: Number(event.timestamp),
  });
}

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

function cleanAdminNote(value: unknown) {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\u0000/g, "").trim().slice(0, 4_000);
  return clean || null;
}

function cleanFollowUpAt(value: unknown) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? Math.round(timestamp) : null;
}

function normalizeLead(lead: Partial<Lead>): Lead {
  return {
    id: typeof lead.id === "string" ? lead.id : crypto.randomUUID(),
    sessionId: typeof lead.sessionId === "string" ? lead.sessionId : "unknown",
    fullName: typeof lead.fullName === "string" ? lead.fullName : "",
    phone: typeof lead.phone === "string" ? lead.phone : "",
    email: typeof lead.email === "string" ? lead.email : null,
    q1: typeof lead.q1 === "string" ? lead.q1 : null,
    q2: typeof lead.q2 === "string" ? lead.q2 : null,
    q3: typeof lead.q3 === "string" ? lead.q3 : null,
    q4: typeof lead.q4 === "string" ? lead.q4 : null,
    consultationType: lead.consultationType === "remote" ? "remote" : "in_person",
    source: typeof lead.source === "string" ? lead.source : null,
    referrer: typeof lead.referrer === "string" ? lead.referrer : null,
    utmSource: typeof lead.utmSource === "string" ? lead.utmSource : null,
    utmMedium: typeof lead.utmMedium === "string" ? lead.utmMedium : null,
    utmCampaign: typeof lead.utmCampaign === "string" ? lead.utmCampaign : null,
    utmTerm: typeof lead.utmTerm === "string" ? lead.utmTerm : null,
    utmContent: typeof lead.utmContent === "string" ? lead.utmContent : null,
    landingPath: typeof lead.landingPath === "string" ? lead.landingPath : null,
    status: isLeadStatus(lead.status) ? lead.status : "new",
    adminNote: cleanAdminNote(lead.adminNote),
    followUpAt: cleanFollowUpAt(lead.followUpAt),
    updatedAt: Number(lead.updatedAt) || Number(lead.timestamp) || Date.now(),
    timestamp: Number(lead.timestamp) || 0,
  };
}

function toDbLead(lead: Lead): DbLead {
  return {
    id: lead.id,
    session_id: lead.sessionId,
    full_name: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    q1: lead.q1,
    q2: lead.q2,
    q3: lead.q3,
    q4: lead.q4,
    consultation_type: lead.consultationType,
    source: lead.source,
    referrer: lead.referrer,
    utm_source: lead.utmSource,
    utm_medium: lead.utmMedium,
    utm_campaign: lead.utmCampaign,
    utm_term: lead.utmTerm,
    utm_content: lead.utmContent,
    landing_path: lead.landingPath,
    status: lead.status,
    admin_note: lead.adminNote,
    follow_up_at: lead.followUpAt,
    updated_at: lead.updatedAt,
    timestamp: lead.timestamp,
  };
}

function toLegacyDbLead(lead: Lead) {
  const record = toDbLead(lead);
  const { status, admin_note, follow_up_at, updated_at, ...legacy } = record;
  return legacy;
}

function fromDbLead(lead: DbLead): Lead {
  return normalizeLead({
    id: lead.id,
    sessionId: lead.session_id,
    fullName: lead.full_name,
    phone: lead.phone,
    email: lead.email,
    q1: lead.q1,
    q2: lead.q2,
    q3: lead.q3,
    q4: lead.q4,
    consultationType: lead.consultation_type,
    source: lead.source,
    referrer: lead.referrer,
    utmSource: lead.utm_source,
    utmMedium: lead.utm_medium,
    utmCampaign: lead.utm_campaign,
    utmTerm: lead.utm_term,
    utmContent: lead.utm_content,
    landingPath: lead.landing_path,
    status: lead.status ?? undefined,
    adminNote: lead.admin_note,
    followUpAt: lead.follow_up_at ?? undefined,
    updatedAt: lead.updated_at ?? undefined,
    timestamp: Number(lead.timestamp),
  });
}

function normalizeCampaignLink(link: Partial<CampaignLink>): CampaignLink {
  const destination = link.destination === "/quiz" ? "/quiz" : "/";
  return {
    id: typeof link.id === "string" ? link.id : crypto.randomUUID(),
    slug: typeof link.slug === "string" ? link.slug : "",
    label: typeof link.label === "string" ? link.label : "",
    source: typeof link.source === "string" ? link.source : "other",
    medium: typeof link.medium === "string" ? link.medium : "other",
    campaign: typeof link.campaign === "string" ? link.campaign : "uncategorized",
    destination,
    createdAt: Number(link.createdAt) || Date.now(),
  };
}

function toDbCampaignLink(link: CampaignLink): DbCampaignLink {
  return {
    id: link.id,
    slug: link.slug,
    label: link.label,
    source: link.source,
    medium: link.medium,
    campaign: link.campaign,
    destination: link.destination,
    created_at: link.createdAt,
  };
}

function fromDbCampaignLink(link: DbCampaignLink): CampaignLink {
  return normalizeCampaignLink({
    id: link.id,
    slug: link.slug,
    label: link.label,
    source: link.source,
    medium: link.medium,
    campaign: link.campaign,
    destination: link.destination === "/quiz" ? "/quiz" : "/",
    createdAt: Number(link.created_at),
  });
}

function toDbTrackingSettings(settings: TrackingSettings): DbTrackingSettings {
  return {
    id: "default",
    meta_pixel_id: settings.metaPixelId || null,
    google_tag_manager_id: settings.googleTagManagerId || null,
    ga4_measurement_id: settings.ga4MeasurementId || null,
    google_ads_id: settings.googleAdsId || null,
    google_ads_conversion_label: settings.googleAdsConversionLabel || null,
    tiktok_pixel_id: settings.tiktokPixelId || null,
    linkedin_partner_id: settings.linkedInPartnerId || null,
    linkedin_conversion_id: settings.linkedInConversionId || null,
    microsoft_uet_tag_id: settings.microsoftUetTagId || null,
    clarity_project_id: settings.clarityProjectId || null,
    updated_at: settings.updatedAt,
  };
}

function fromDbTrackingSettings(settings: DbTrackingSettings): TrackingSettings {
  return sanitizeTrackingSettings({
    metaPixelId: settings.meta_pixel_id,
    googleTagManagerId: settings.google_tag_manager_id,
    ga4MeasurementId: settings.ga4_measurement_id,
    googleAdsId: settings.google_ads_id,
    googleAdsConversionLabel: settings.google_ads_conversion_label,
    tiktokPixelId: settings.tiktok_pixel_id,
    linkedInPartnerId: settings.linkedin_partner_id,
    linkedInConversionId: settings.linkedin_conversion_id,
    microsoftUetTagId: settings.microsoft_uet_tag_id,
    clarityProjectId: settings.clarity_project_id,
    updatedAt: settings.updated_at,
  });
}

export async function appendEvent(event: QuizEvent): Promise<boolean> {
  if (getStoreStatus() === "file") return appendFile("events.json", event, MAX_EVENTS);
  if (!hasSupabaseConfig()) return false;

  const response = await supabaseRequest("kindred_path_quiz_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDbEvent(event)),
  });
  await logSupabaseFailure("event write", response);
  return response?.ok ?? false;
}

export async function readEvents(): Promise<QuizEvent[]> {
  if (getStoreStatus() === "file") {
    return readFile<Partial<QuizEvent>>("events.json").map(normalizeEvent);
  }
  if (!hasSupabaseConfig()) return [];

  const response = await supabaseRequest(
    `kindred_path_quiz_events?select=id,session_id,visit_id,step,event_type,path,metadata,timestamp&order=timestamp.asc&limit=${MAX_EVENTS}`,
    { method: "GET" }
  );
  if (!response?.ok) {
    await logSupabaseFailure("event read", response);
    return [];
  }

  try {
    const records: unknown = await response.json();
    return Array.isArray(records) ? (records as DbEvent[]).map(fromDbEvent) : [];
  } catch (error) {
    console.error("Kindred Path event data could not be read:", error);
    return [];
  }
}

export async function appendLead(lead: Lead): Promise<boolean> {
  if (getStoreStatus() === "file") return appendFile("leads.json", lead, MAX_LEADS);
  if (!hasSupabaseConfig()) return false;

  let response = await supabaseRequest("kindred_path_quiz_leads", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDbLead(lead)),
  });
  // A live site can continue collecting leads while an operator applies the
  // additive dashboard migration. Workflow fields simply become available
  // after the schema update; no submitted lead is discarded in the meantime.
  if (!response?.ok) {
    response = await supabaseRequest("kindred_path_quiz_leads", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(toLegacyDbLead(lead)),
    });
  }
  await logSupabaseFailure("lead write", response);
  return response?.ok ?? false;
}

export async function readLeads(): Promise<Lead[]> {
  if (getStoreStatus() === "file") {
    return readFile<Partial<Lead>>("leads.json").map(normalizeLead);
  }
  if (!hasSupabaseConfig()) return [];

  let response = await supabaseRequest(
    `kindred_path_quiz_leads?select=id,session_id,full_name,phone,email,q1,q2,q3,q4,consultation_type,source,referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content,landing_path,status,admin_note,follow_up_at,updated_at,timestamp&order=timestamp.desc&limit=${MAX_LEADS}`,
    { method: "GET" }
  );
  if (!response?.ok) {
    response = await supabaseRequest(
      `kindred_path_quiz_leads?select=id,session_id,full_name,phone,email,q1,q2,q3,q4,consultation_type,source,referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content,landing_path,timestamp&order=timestamp.desc&limit=${MAX_LEADS}`,
      { method: "GET" }
    );
  }
  if (!response?.ok) {
    await logSupabaseFailure("lead read", response);
    return [];
  }

  try {
    const records: unknown = await response.json();
    return Array.isArray(records) ? (records as DbLead[]).map(fromDbLead) : [];
  } catch (error) {
    console.error("Kindred Path lead data could not be read:", error);
    return [];
  }
}

/** Updates only the protected, internal follow-up workflow for one lead. */
export async function updateLead(id: string, update: LeadUpdate): Promise<Lead | null> {
  if (!id || id.length > 160 || !isLeadStatus(update.status)) return null;
  const now = Date.now();
  const safeUpdate: LeadUpdate = {
    status: update.status,
    adminNote: cleanAdminNote(update.adminNote),
    followUpAt: cleanFollowUpAt(update.followUpAt),
  };

  if (getStoreStatus() === "file") {
    const leads = readFile<Partial<Lead>>("leads.json").map(normalizeLead);
    const index = leads.findIndex((lead) => lead.id === id);
    if (index < 0) return null;
    const next = normalizeLead({ ...leads[index], ...safeUpdate, updatedAt: now });
    leads[index] = next;
    return writeFile("leads.json", leads) ? next : null;
  }
  if (!hasSupabaseConfig()) return null;

  const response = await supabaseRequest(
    `kindred_path_quiz_leads?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: safeUpdate.status,
        admin_note: safeUpdate.adminNote,
        follow_up_at: safeUpdate.followUpAt,
        updated_at: now,
      }),
    }
  );
  if (!response?.ok) {
    await logSupabaseFailure("lead workflow update", response);
    return null;
  }
  try {
    const records: unknown = await response.json();
    const record = Array.isArray(records) ? records[0] : null;
    return record ? fromDbLead(record as DbLead) : null;
  } catch (error) {
    console.error("Kindred Path lead workflow response could not be read:", error);
    return null;
  }
}

export async function createCampaignLink(link: CampaignLink): Promise<boolean> {
  if (getStoreStatus() === "file") {
    const existing = readFile<Partial<CampaignLink>>("campaign-links.json").map(normalizeCampaignLink);
    if (existing.some((item) => item.slug === link.slug)) return false;
    return appendFile("campaign-links.json", link, MAX_CAMPAIGN_LINKS);
  }
  if (!hasSupabaseConfig()) return false;

  const response = await supabaseRequest("kindred_path_campaign_links", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDbCampaignLink(link)),
  });
  await logSupabaseFailure("campaign link write", response);
  return response?.ok ?? false;
}

export async function readCampaignLinks(): Promise<CampaignLink[]> {
  if (getStoreStatus() === "file") {
    return readFile<Partial<CampaignLink>>("campaign-links.json")
      .map(normalizeCampaignLink)
      .filter((link) => Boolean(link.slug))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  if (!hasSupabaseConfig()) return [];

  const response = await supabaseRequest(
    `kindred_path_campaign_links?select=id,slug,label,source,medium,campaign,destination,created_at&order=created_at.desc&limit=${MAX_CAMPAIGN_LINKS}`,
    { method: "GET" }
  );
  if (!response?.ok) {
    await logSupabaseFailure("campaign link read", response);
    return [];
  }

  try {
    const records: unknown = await response.json();
    return Array.isArray(records) ? (records as DbCampaignLink[]).map(fromDbCampaignLink) : [];
  } catch (error) {
    console.error("Kindred Path campaign links could not be read:", error);
    return [];
  }
}

export async function findCampaignLink(slug: string): Promise<CampaignLink | null> {
  const links = await readCampaignLinks();
  return links.find((link) => link.slug === slug) ?? null;
}

/** Read the public identifiers only; private API keys never belong here. */
export async function readTrackingSettings(): Promise<TrackingSettings> {
  if (getStoreStatus() === "file") {
    const stored = readFile<TrackingSettings>("tracking-settings.json")[0];
    return stored ? sanitizeTrackingSettings(stored) : { ...EMPTY_TRACKING_SETTINGS };
  }
  if (!hasSupabaseConfig()) return { ...EMPTY_TRACKING_SETTINGS };

  const response = await supabaseRequest(
    "kindred_path_tracking_settings?select=id,meta_pixel_id,google_tag_manager_id,ga4_measurement_id,google_ads_id,google_ads_conversion_label,tiktok_pixel_id,linkedin_partner_id,linkedin_conversion_id,microsoft_uet_tag_id,clarity_project_id,updated_at&id=eq.default&limit=1",
    { method: "GET" }
  );
  if (!response?.ok) {
    await logSupabaseFailure("tracking settings read", response);
    return { ...EMPTY_TRACKING_SETTINGS };
  }
  try {
    const records: unknown = await response.json();
    const record = Array.isArray(records) ? records[0] : null;
    return record ? fromDbTrackingSettings(record as DbTrackingSettings) : { ...EMPTY_TRACKING_SETTINGS };
  } catch (error) {
    console.error("Kindred Path tracking settings could not be read:", error);
    return { ...EMPTY_TRACKING_SETTINGS };
  }
}

/** Stores vendor IDs entered by a signed-in admin. No raw third-party code is stored or run. */
export async function updateTrackingSettings(value: unknown): Promise<TrackingSettings | null> {
  const settings = sanitizeTrackingSettings({
    ...(value && typeof value === "object" ? value : {}),
    updatedAt: Date.now(),
  });

  if (getStoreStatus() === "file") {
    return writeFile("tracking-settings.json", [settings]) ? settings : null;
  }
  if (!hasSupabaseConfig()) return null;

  const response = await supabaseRequest("kindred_path_tracking_settings?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(toDbTrackingSettings(settings)),
  });
  if (!response?.ok) {
    await logSupabaseFailure("tracking settings save", response);
    return null;
  }
  try {
    const records: unknown = await response.json();
    const record = Array.isArray(records) ? records[0] : null;
    return record ? fromDbTrackingSettings(record as DbTrackingSettings) : settings;
  } catch (error) {
    console.error("Kindred Path tracking settings response could not be read:", error);
    return settings;
  }
}
