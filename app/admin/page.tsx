import Link from "next/link";
import { headers } from "next/headers";
import BrandHeader from "@/components/BrandHeader";
import CampaignLinkManager, {
  type CampaignLinkDashboardRow,
} from "@/components/CampaignLinkManager";
import {
  getStoreStatus,
  readCampaignLinks,
  readEvents,
  readLeads,
  type Lead,
  type QuizEvent,
} from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RangeKey = "7d" | "30d" | "90d" | "all";
type DashboardProps = { searchParams?: Promise<{ range?: string | string[] }> };
type Metric = { views: number; visitors: Set<string>; visits: Set<string>; leads: number };

const RANGES: Array<{ key: RangeKey; label: string; days: number | null }> = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

const FUNNEL_STEPS = [
  { keys: ["LandingView"], label: "Viewed landing page" },
  { keys: ["LandingQuizCtaClicked"], label: "Clicked quiz start" },
  { keys: ["QuizStarted"], label: "Viewed question 1" },
  { keys: ["QuizQ1Answered"], label: "Answered question 1" },
  { keys: ["QuizQ2Viewed"], label: "Viewed question 2" },
  { keys: ["QuizQ2Answered"], label: "Answered question 2" },
  { keys: ["QuizQ3Viewed"], label: "Viewed question 3" },
  { keys: ["QuizQ3Answered"], label: "Answered question 3" },
  { keys: ["QuizQ4Viewed"], label: "Viewed optional question 4" },
  { keys: ["QuizQ4Answered", "QuizQ4Skipped"], label: "Finished or skipped question 4" },
  { keys: ["QuizReachedContactForm"], label: "Reached contact form" },
  { keys: ["QuizContactSubmitStarted"], label: "Started contact submit" },
  { keys: ["BookingConfirmedView"], label: "Reached confirmation" },
] as const;

const STEP_LABELS: Record<string, string> = {
  PageViewed: "Page view",
  CampaignLinkClicked: "Clicked tracked campaign link",
  LandingView: "Viewed landing page",
  LandingQuizCtaClicked: "Clicked quiz start",
  LandingPrivacyClicked: "Opened privacy policy from landing",
  QuizStarted: "Viewed question 1",
  QuizQ1Answered: "Answered question 1",
  QuizQ2Viewed: "Viewed question 2",
  QuizQ2Answered: "Answered question 2",
  QuizQ3Viewed: "Viewed question 3",
  QuizQ3Answered: "Answered question 3",
  QuizQ4Viewed: "Viewed optional question 4",
  QuizQ4Answered: "Answered optional question 4",
  QuizQ4Skipped: "Skipped optional question 4",
  QuizReachedContactForm: "Viewed contact form",
  QuizContactValidationFailed: "Contact form validation failed",
  QuizContactSubmitStarted: "Started contact submit",
  QuizSubmitting: "Viewed confirmation preparation",
  QuizContactSubmitted: "Contact details saved",
  QuizContactSubmitFailed: "Contact submit failed",
  QuizBackToQ1: "Went back to question 1",
  QuizBackToQ2: "Went back to question 2",
  QuizBackToQ3: "Went back to question 3",
  QuizPrivacyClicked: "Opened privacy policy from quiz",
  BookingConfirmedView: "Viewed confirmation",
  BookingWhatsAppClicked: "Clicked WhatsApp",
  BookingBackToHomeClicked: "Returned to homepage",
  BookingPrivacyClicked: "Opened privacy policy from confirmation",
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStep(step: string) {
  return STEP_LABELS[step] ?? step;
}

function pathLabel(path: string) {
  if (path === "/") return "Landing page";
  return path || "Not recorded";
}

function selectedRange(input: Awaited<DashboardProps["searchParams"]>) {
  const raw = typeof input?.range === "string" ? input.range : "30d";
  return RANGES.find((range) => range.key === raw) ?? RANGES[1];
}

async function dashboardOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = (requestHeaders.get("x-forwarded-proto") || "https").split(",")[0];
  if (host) return `${protocol}://${host}`;
  return "http://localhost:3000";
}

function sourceForEvent(event: QuizEvent) {
  return event.metadata.utmSource || event.metadata.source || event.metadata.referrer || "Direct";
}

function sourceForLead(lead: Lead) {
  return lead.source || lead.referrer || "Direct";
}

function metricFor(map: Map<string, Metric>, key: string) {
  const current = map.get(key) ?? { views: 0, visitors: new Set<string>(), visits: new Set<string>(), leads: 0 };
  map.set(key, current);
  return current;
}

function dayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function dayLabel(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
  });
}

function makeTrend(events: QuizEvent[], leads: Lead[], days: number) {
  const now = new Date();
  const byDay = new Map<string, { key: string; views: number; leads: number }>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    byDay.set(key, { key, views: 0, leads: 0 });
  }
  for (const event of events) {
    const item = byDay.get(dayKey(event.timestamp));
    if (item && event.eventType === "page_view") item.views += 1;
  }
  for (const lead of leads) {
    const item = byDay.get(dayKey(lead.timestamp));
    if (item) item.leads += 1;
  }
  return [...byDay.values()];
}

function StatCard({ label, value, detail, tone = "plum" }: { label: string; value: string | number; detail: string; tone?: "plum" | "berry" | "green" | "amber" }) {
  const tones = {
    plum: "bg-plum-50 text-plum-600",
    berry: "bg-[#fff1f7] text-berry",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="rounded-2xl border border-plum-50 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/40">{label}</p>
          <p className="mt-2 font-serif text-3xl font-medium text-plum-700">{value}</p>
          <p className="mt-1 text-xs text-ink/50">{detail}</p>
        </div>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`} aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        </span>
      </div>
    </div>
  );
}

function TrafficTrend({ points }: { points: Array<{ key: string; views: number; leads: number }> }) {
  const max = Math.max(1, ...points.map((point) => point.views));
  const width = 720;
  const height = 190;
  const padding = 14;
  const coordinates = points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : padding + (index / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - (point.views / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-ink/50">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-plum-600" />Page views</span>
        <span>{points.reduce((total, point) => total + point.leads, 0)} leads in this period</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible" role="img" aria-label="Daily page views">
        <defs>
          <linearGradient id="traffic-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7E4CAB" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7E4CAB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((position) => (
          <line key={position} x1={padding} x2={width - padding} y1={height * position} y2={height * position} stroke="#F1EBF6" strokeWidth="1" />
        ))}
        {points.length > 1 && <polygon points={`${padding},${height - padding} ${coordinates} ${width - padding},${height - padding}`} fill="url(#traffic-fill)" />}
        <polyline points={coordinates} fill="none" stroke="#4A1D6E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = points.length === 1 ? width / 2 : padding + (index / (points.length - 1)) * (width - padding * 2);
          const y = height - padding - (point.views / max) * (height - padding * 2);
          return <circle key={point.key} cx={x} cy={y} r="3.5" fill="#ffffff" stroke="#4A1D6E" strokeWidth="2" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink/40">
        <span>{dayLabel(points[0]?.key ?? dayKey(Date.now()))}</span>
        <span>{dayLabel(points[points.length - 1]?.key ?? dayKey(Date.now()))}</span>
      </div>
    </div>
  );
}

export default async function AdminDashboard({ searchParams }: DashboardProps) {
  const [allEvents, allLeads, campaignLinks] = await Promise.all([
    readEvents(),
    readLeads(),
    readCampaignLinks(),
  ]);
  const range = selectedRange(await searchParams);
  const rangeStart = range.days ? Date.now() - range.days * 24 * 60 * 60 * 1000 : 0;
  const events = allEvents.filter((event) => event.timestamp >= rangeStart);
  const leads = allLeads.filter((lead) => lead.timestamp >= rangeStart);
  const storeStatus = getStoreStatus();
  const siteOrigin = await dashboardOrigin();
  const pageViews = events.filter((event) => event.eventType === "page_view");
  const campaignLinkRows: CampaignLinkDashboardRow[] = campaignLinks.map((link) => ({
    ...link,
    url: `${siteOrigin}/go/${link.slug}`,
    clicks: events.filter(
      (event) => event.step === "CampaignLinkClicked" && event.metadata.linkCode === link.slug
    ).length,
    landingVisits: pageViews.filter((event) => event.metadata.linkCode === link.slug).length,
    leads: leads.filter((lead) => lead.utmContent === link.slug).length,
  }));
  const visitorIds = new Set(pageViews.map((event) => event.sessionId));
  const visitIds = new Set(pageViews.map((event) => event.visitId));
  const activeVisitors = new Set(
    pageViews.filter((event) => event.timestamp >= Date.now() - 5 * 60 * 1000).map((event) => event.sessionId)
  ).size;
  const conversion = visitIds.size ? ((leads.length / visitIds.size) * 100).toFixed(1) : "0.0";
  const trend = makeTrend(events, leads, range.days ?? 30);

  const sourceMetrics = new Map<string, Metric>();
  for (const event of pageViews) {
    const source = sourceForEvent(event);
    const campaign = event.metadata.utmCampaign || "No campaign";
    const metric = metricFor(sourceMetrics, `${source}::${campaign}`);
    metric.views += 1;
    metric.visitors.add(event.sessionId);
    metric.visits.add(event.visitId);
  }
  for (const lead of leads) {
    const source = sourceForLead(lead);
    const campaign = lead.utmCampaign || "No campaign";
    metricFor(sourceMetrics, `${source}::${campaign}`).leads += 1;
  }
  const sourceRows = [...sourceMetrics.entries()]
    .map(([key, metric]) => {
      const [source, campaign] = key.split("::");
      return { source, campaign, ...metric };
    })
    .sort((a, b) => b.visits.size - a.visits.size || b.leads - a.leads)
    .slice(0, 8);

  const pageMetrics = new Map<string, Metric>();
  for (const event of pageViews) {
    const metric = metricFor(pageMetrics, event.path || "/");
    metric.views += 1;
    metric.visitors.add(event.sessionId);
    metric.visits.add(event.visitId);
  }
  const topPages = [...pageMetrics.entries()]
    .map(([path, metric]) => ({ path, ...metric }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const deviceMetrics = new Map<string, Metric>();
  for (const event of pageViews) {
    const device = event.metadata.device || "unknown";
    const metric = metricFor(deviceMetrics, device);
    metric.views += 1;
    metric.visitors.add(event.sessionId);
    metric.visits.add(event.visitId);
  }
  const deviceRows = [...deviceMetrics.entries()]
    .map(([device, metric]) => ({ device, ...metric }))
    .sort((a, b) => b.visits.size - a.visits.size);

  const bySession = new Map<string, { steps: Set<string>; lastSeen: number; lastStep: string }>();
  for (const event of [...events].sort((a, b) => a.timestamp - b.timestamp)) {
    const session = bySession.get(event.sessionId) ?? {
      steps: new Set<string>(),
      lastSeen: event.timestamp,
      lastStep: event.step,
    };
    session.steps.add(event.step);
    session.lastSeen = event.timestamp;
    session.lastStep = event.step;
    bySession.set(event.sessionId, session);
  }
  const funnelCounts = FUNNEL_STEPS.map((step) => ({
    ...step,
    count: [...bySession.values()].filter((session) => step.keys.some((key) => session.steps.has(key))).length,
  }));
  const funnelBase = funnelCounts[0]?.count || 1;
  const sortedLeads = [...leads].sort((a, b) => b.timestamp - a.timestamp);
  const recentEvents = [...events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  const sessionRows = [...bySession.entries()].sort((a, b) => b[1].lastSeen - a[1].lastSeen).slice(0, 100);
  const remoteLeads = sortedLeads.filter((lead) => lead.consultationType === "remote").length;
  const pixelStatuses: Array<[string, boolean]> = [
    ["Meta Pixel", Boolean(process.env.NEXT_PUBLIC_FB_PIXEL_ID)],
    ["Google Tag Manager", Boolean(process.env.NEXT_PUBLIC_GTM_ID)],
    ["GA4", Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)],
    ["Google Ads", Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID)],
    ["TikTok Pixel", Boolean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID)],
    ["LinkedIn Insight", Boolean(process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID)],
    ["Microsoft UET", Boolean(process.env.NEXT_PUBLIC_MICROSOFT_UET_TAG_ID)],
  ];
  const configuredPixels = pixelStatuses.filter(([, enabled]) => enabled).length;

  return (
    <main className="bg-texture min-h-screen px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-plum-100 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <BrandHeader className="justify-start" />
            <div className="hidden h-9 w-px bg-plum-100 sm:block" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-plum-400">Private workspace</p>
              <h1 className="font-serif text-2xl font-medium text-plum-700">Analytics and leads</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Signed admin session
            </span>
            <a href="/api/admin/logout" className="focus-ring text-sm font-semibold text-plum-500 hover:text-plum-700">
              Log out
            </a>
          </div>
        </header>

        {storeStatus === "setup-required" && (
          <div className="mb-7 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
            <strong>Persistent storage still needs to be connected.</strong> The dashboard is secure and will not throw a server error, but live traffic and leads cannot be retained until the updated Supabase schema and environment values are set.
          </div>
        )}
        {storeStatus === "file" && (
          <div className="mb-7 rounded-2xl border border-plum-100 bg-white/80 px-5 py-4 text-sm leading-relaxed text-ink/60">
            Development file storage is active. Connect Supabase before serverless deployment so analytics and leads remain durable.
          </div>
        )}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-plum-400">Overview</p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-plum-700">How people are arriving and progressing</h2>
          </div>
          <nav aria-label="Analytics date range" className="inline-flex self-start rounded-xl border border-plum-100 bg-white p-1 shadow-soft">
            {RANGES.map((option) => (
              <Link
                key={option.key}
                href={`/admin?range=${option.key}`}
                className={`focus-ring rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  range.key === option.key ? "bg-plum-600 text-white" : "text-plum-500 hover:bg-plum-50"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Unique visitors" value={visitorIds.size} detail={`${activeVisitors} active in last 5 min`} />
          <StatCard label="Visits" value={visitIds.size} detail={`${pageViews.length} total page views`} tone="berry" />
          <StatCard label="Leads" value={sortedLeads.length} detail={`${remoteLeads} remote follow-up`} tone="green" />
          <StatCard label="Visit → lead" value={`${conversion}%`} detail="Visit-level conversion" tone="amber" />
          <StatCard label="Quiz actions" value={events.filter((event) => event.eventType === "action").length} detail="Clicks and progress points" />
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-medium text-plum-700">Traffic trend</h2>
                <p className="mt-1 text-sm text-ink/50">Page views and captured leads across the selected period.</p>
              </div>
              <span className="rounded-full bg-plum-50 px-3 py-1 text-xs font-semibold text-plum-600">{range.label}</span>
            </div>
            <TrafficTrend points={trend} />
          </div>

          <div className="rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
            <h2 className="font-serif text-xl font-medium text-plum-700">Tracking health</h2>
            <p className="mt-1 text-sm text-ink/50">Private first-party analytics is always anonymous. Marketing tools require consent.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {pixelStatuses.map(([name, enabled]) => (
                <div key={name} className="rounded-xl border border-plum-50 bg-[#fcfbfd] px-3 py-2.5">
                  <p className="text-xs font-medium text-ink">{name}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${enabled ? "text-emerald-700" : "text-ink/35"}`}>
                    {enabled ? "Configured" : "Not added"}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-plum-50 px-3 py-2.5 text-xs leading-relaxed text-plum-600">
              {configuredPixels} of {pixelStatuses.length} optional tools configured. IDs are set privately through environment values, never entered in the browser.
            </p>
          </div>
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-medium text-plum-700">Acquisition</h2>
                <p className="mt-1 text-sm text-ink/50">Source and UTM campaign performance.</p>
              </div>
            </div>
            {sourceRows.length === 0 ? (
              <p className="text-sm text-ink/50">No traffic source data in this period yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[510px] text-left text-sm">
                  <thead><tr className="border-b border-plum-50 text-[11px] uppercase tracking-wide text-ink/40"><th className="pb-2 pr-4 font-medium">Source</th><th className="pb-2 pr-4 font-medium">Campaign</th><th className="pb-2 pr-4 font-medium">Visits</th><th className="pb-2 pr-4 font-medium">Visitors</th><th className="pb-2 font-medium">Leads</th></tr></thead>
                  <tbody>
                    {sourceRows.map((row) => (
                      <tr key={`${row.source}-${row.campaign}`} className="border-b border-plum-50/70">
                        <td className="py-3 pr-4 font-semibold text-ink">{row.source}</td>
                        <td className="py-3 pr-4 text-xs text-ink/55">{row.campaign}</td>
                        <td className="py-3 pr-4 text-ink/70">{row.visits.size}</td>
                        <td className="py-3 pr-4 text-ink/70">{row.visitors.size}</td>
                        <td className="py-3 font-semibold text-plum-600">{row.leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
            <h2 className="font-serif text-xl font-medium text-plum-700">Top pages and devices</h2>
            <p className="mt-1 text-sm text-ink/50">Normal traffic is tracked across public pages, not only the quiz.</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-plum-400">Pages</p>
                {topPages.length === 0 ? <p className="text-sm text-ink/50">No page data yet.</p> : <div className="space-y-3">{topPages.map((page) => <div key={page.path}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-ink">{pathLabel(page.path)}</span><span className="text-ink/45">{page.views}</span></div><div className="h-1.5 rounded-full bg-plum-50"><div className="h-full rounded-full bg-plum-600" style={{ width: `${Math.max(8, Math.round((page.views / Math.max(1, topPages[0]?.views ?? 1)) * 100))}%` }} /></div></div>)}</div>}
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-plum-400">Devices</p>
                {deviceRows.length === 0 ? <p className="text-sm text-ink/50">No device data yet.</p> : <div className="space-y-3">{deviceRows.map((device) => <div key={device.device} className="flex items-center justify-between text-sm"><span className="capitalize text-ink">{device.device}</span><span className="font-semibold text-plum-600">{device.visits.size} visits</span></div>)}</div>}
              </div>
            </div>
          </div>
        </section>

        <CampaignLinkManager rows={campaignLinkRows} baseUrl={siteOrigin} />

        <section className="mt-7 rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
          <div className="mb-5">
            <h2 className="font-serif text-xl font-medium text-plum-700">Quiz conversion funnel</h2>
            <p className="mt-1 text-sm text-ink/50">Each step is first-party tracked; individual answers are not sent to advertising platforms.</p>
          </div>
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
            {funnelCounts.map((step, index) => {
              const percentage = Math.round((step.count / funnelBase) * 100);
              const previous = index === 0 ? step.count : funnelCounts[index - 1].count;
              const dropped = index === 0 ? 0 : Math.max(previous - step.count, 0);
              return (
                <div key={step.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-4 text-sm"><span className="font-medium text-ink">{step.label}</span><span className="shrink-0 text-ink/50">{step.count} · {percentage}%</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-plum-50"><div className="h-full rounded-full bg-gradient-to-r from-plum-600 to-berry" style={{ width: `${percentage}%` }} /></div>
                  {dropped > 0 && <p className="mt-1 text-xs text-red-400">−{dropped} from the previous step</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="font-serif text-xl font-medium text-plum-700">Captured leads</h2><p className="mt-1 text-sm text-ink/50">Private contact details and first-touch source, for timely follow-up.</p></div>
            <span className="text-xs font-semibold text-plum-500">{sortedLeads.length} in {range.label.toLowerCase()}</span>
          </div>
          {sortedLeads.length === 0 ? <p className="text-sm text-ink/50">No leads yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[810px] text-left text-sm"><thead><tr className="border-b border-plum-50 text-[11px] uppercase tracking-wide text-ink/40"><th className="pb-2 pr-4 font-medium">Name</th><th className="pb-2 pr-4 font-medium">Phone</th><th className="pb-2 pr-4 font-medium">Email</th><th className="pb-2 pr-4 font-medium">Type</th><th className="pb-2 pr-4 font-medium">Source</th><th className="pb-2 pr-4 font-medium">Campaign</th><th className="pb-2 font-medium">When</th></tr></thead><tbody>{sortedLeads.map((lead) => <tr key={lead.id} className="border-b border-plum-50/70"><td className="py-3 pr-4 font-semibold text-ink">{lead.fullName}</td><td className="py-3 pr-4 text-ink/70">{lead.phone}</td><td className="py-3 pr-4 text-ink/70">{lead.email || "Not provided"}</td><td className="py-3 pr-4"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${lead.consultationType === "remote" ? "bg-amber-50 text-amber-700" : "bg-plum-50 text-plum-600"}`}>{lead.consultationType === "remote" ? "Remote" : "In-person"}</span></td><td className="py-3 pr-4 text-xs text-ink/60">{sourceForLead(lead)}</td><td className="py-3 pr-4 text-xs text-ink/60">{lead.utmCampaign || "Not recorded"}</td><td className="py-3 text-xs text-ink/50">{formatDate(lead.timestamp)}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
            <h2 className="font-serif text-xl font-medium text-plum-700">Recent activity</h2>
            <p className="mt-1 text-sm text-ink/50">Last 100 anonymous traffic and quiz events.</p>
            {recentEvents.length === 0 ? <p className="mt-5 text-sm text-ink/50">No activity yet.</p> : <div className="mt-5 max-h-[34rem] overflow-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 bg-white"><tr className="border-b border-plum-50 text-[11px] uppercase tracking-wide text-ink/40"><th className="pb-2 pr-3 font-medium">Visitor</th><th className="pb-2 pr-3 font-medium">Activity</th><th className="pb-2 pr-3 font-medium">Source</th><th className="pb-2 font-medium">When</th></tr></thead><tbody>{recentEvents.map((event) => <tr key={event.id} className="border-b border-plum-50/70"><td className="py-2.5 pr-3 font-mono text-xs text-ink/45">{event.sessionId.slice(0, 8)}</td><td className="py-2.5 pr-3"><p className="text-ink">{formatStep(event.step)}</p><p className="mt-0.5 font-mono text-[10px] text-ink/40">{pathLabel(event.path)}</p></td><td className="py-2.5 pr-3 text-xs text-ink/55">{event.eventType === "page_view" ? sourceForEvent(event) : "Not recorded"}</td><td className="py-2.5 text-xs text-ink/50">{formatDate(event.timestamp)}</td></tr>)}</tbody></table></div>}
          </div>

          <div className="rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
            <h2 className="font-serif text-xl font-medium text-plum-700">Visitor progression</h2>
            <p className="mt-1 text-sm text-ink/50">Most recent 100 anonymous visitors and their last recorded action.</p>
            {sessionRows.length === 0 ? <p className="mt-5 text-sm text-ink/50">No visitor journeys yet.</p> : <div className="mt-5 max-h-[34rem] overflow-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="sticky top-0 bg-white"><tr className="border-b border-plum-50 text-[11px] uppercase tracking-wide text-ink/40"><th className="pb-2 pr-3 font-medium">Visitor</th><th className="pb-2 pr-3 font-medium">Last action</th><th className="pb-2 font-medium">Last active</th></tr></thead><tbody>{sessionRows.map(([sessionId, data]) => <tr key={sessionId} className="border-b border-plum-50/70"><td className="py-2.5 pr-3 font-mono text-xs text-ink/45">{sessionId.slice(0, 8)}</td><td className="py-2.5 pr-3 text-ink">{formatStep(data.lastStep)}</td><td className="py-2.5 text-xs text-ink/50">{formatDate(data.lastSeen)}</td></tr>)}</tbody></table></div>}
          </div>
        </section>

        <p className="mt-8 text-center text-xs leading-relaxed text-ink/40">This dashboard keeps source, page, device and action data anonymous. Contact details and answers are visible only in the protected lead area.</p>
      </div>
    </main>
  );
}
