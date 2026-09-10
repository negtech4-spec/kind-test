import fs from "fs";
import path from "path";
import {
  sanitizeAnalyticsMetadata,
  type AnalyticsMetadata,
  type EventType,
  type LeadAttribution,
} from "@/lib/analytics";

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
  timestamp: number;
};

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

/*
  Supports both:
  - SUPABASE_SECRET_KEY (new Supabase key name)
  - SUPABASE_SERVICE_ROLE_KEY (your current Vercel variable)
*/
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

type DataFile = "events.json" | "leads.json" | "campaign-links.json";

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
  timestamp: number;
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

  if (SUPABASE_URL || SUPABASE_SERVER_KEY || isServerless()) {
    return "setup-required";
  }

  return "file";
}

function readFile<T>(name: DataFile): T[] {
  try {
    const file = path.join(DATA_DIR, name);

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "[]", "utf8");
    }

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

    fs.writeFileSync(
      file,
      JSON.stringify(records.slice(-limit)),
      "utf8"
    );

    return true;
  } catch (error) {
    console.error("Kindred Path file store write failed:", error);
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

function normalizeEvent(event: Partial<QuizEvent>): QuizEvent {
  return {
    id: typeof event.id === "string" ? event.id : crypto.randomUUID(),
    sessionId:
      typeof event.sessionId === "string" ? event.sessionId : "unknown",
    visitId:
      typeof event.visitId === "string" && event.visitId
        ? event.visitId
        : event.sessionId ?? "legacy",
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

function normalizeLead(lead: Partial<Lead>): Lead {
  return {
    id: typeof lead.id === "string" ? lead.id : crypto.randomUUID(),
    sessionId:
      typeof lead.sessionId === "string" ? lead.sessionId : "unknown",
    fullName: typeof lead.fullName === "string" ? lead.fullName : "",
    phone: typeof lead.phone === "string" ? lead.phone : "",
    email: typeof lead.email === "string" ? lead.email : null,
    q1: typeof lead.q1 === "string" ? lead.q1 : null,
    q2: typeof lead.q2 === "string" ? lead.q2 : null,
    q3: typeof lead.q3 === "string" ? lead.q3 : null,
    q4: typeof lead.q4 === "string" ? lead.q4 : null,
    consultationType:
      lead.consultationType === "remote" ? "remote" : "in_person",
    source: typeof lead.source === "string" ? lead.source : null,
    referrer: typeof lead.referrer === "string" ? lead.referrer : null,
    utmSource:
      typeof lead.utmSource === "string" ? lead.utmSource : null,
    utmMedium:
      typeof lead.utmMedium === "string" ? lead.utmMedium : null,
    utmCampaign:
      typeof lead.utmCampaign === "string" ? lead.utmCampaign : null,
    utmTerm: typeof lead.utmTerm === "string" ? lead.utmTerm : null,
    utmContent:
      typeof lead.utmContent === "string" ? lead.utmContent : null,
    landingPath:
      typeof lead.landingPath === "string" ? lead.landingPath : null,
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
    timestamp: lead.timestamp,
  };
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
    campaign:
      typeof link.campaign === "string" ? link.campaign : "uncategorized",
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

export async function appendEvent(event: QuizEvent): Promise<boolean> {
  if (getStoreStatus() === "file") {
    return appendFile("events.json", event, MAX_EVENTS);
  }

  if (!hasSupabaseConfig()) return false;

  const response = await supabaseRequest("kindred_path_quiz_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDbEvent(event)),
  });

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

  if (!response?.ok) return [];

  try {
    const records: unknown = await response.json();
    return Array.isArray(records)
      ? (records as DbEvent[]).map(fromDbEvent)
      : [];
  } catch (error) {
    console.error("Kindred Path event data could not be read:", error);
    return [];
  }
}

export async function appendLead(lead: Lead): Promise<boolean> {
  if (getStoreStatus() === "file") {
    return appendFile("leads.json", lead, MAX_LEADS);
  }

  if (!hasSupabaseConfig()) return false;

  const response = await supabaseRequest("kindred_path_quiz_leads", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDbLead(lead)),
  });

  return response?.ok ?? false;
}

export async function readLeads(): Promise<Lead[]> {
  if (getStoreStatus() === "file") {
    return readFile<Partial<Lead>>("leads.json").map(normalizeLead);
  }

  if (!hasSupabaseConfig()) return [];

  const response = await supabaseRequest(
    `kindred_path_quiz_leads?select=id,session_id,full_name,phone,email,q1,q2,q3,q4,consultation_type,source,referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content,landing_path,timestamp&order=timestamp.desc&limit=${MAX_LEADS}`,
    { method: "GET" }
  );

  if (!response?.ok) return [];

  try {
    const records: unknown = await response.json();
    return Array.isArray(records)
      ? (records as DbLead[]).map(fromDbLead)
      : [];
  } catch (error) {
    console.error("Kindred Path lead data could not be read:", error);
    return [];
  }
}

export async function createCampaignLink(
  link: CampaignLink
): Promise<boolean> {
  if (getStoreStatus() === "file") {
    const existing = readFile<Partial<CampaignLink>>(
      "campaign-links.json"
    ).map(normalizeCampaignLink);

    if (existing.some((item) => item.slug === link.slug)) {
      return false;
    }

    return appendFile("campaign-links.json", link, MAX_CAMPAIGN_LINKS);
  }

  if (!hasSupabaseConfig()) return false;

  const response = await supabaseRequest("kindred_path_campaign_links", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDbCampaignLink(link)),
  });

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

  if (!response?.ok) return [];

  try {
    const records: unknown = await response.json();
    return Array.isArray(records)
      ? (records as DbCampaignLink[]).map(fromDbCampaignLink)
      : [];
  } catch (error) {
    console.error("Kindred Path campaign links could not be read:", error);
    return [];
  }
}

export async function findCampaignLink(
  slug: string
): Promise<CampaignLink | null> {
  const links = await readCampaignLinks();
  return links.find((link) => link.slug === slug) ?? null;
}
