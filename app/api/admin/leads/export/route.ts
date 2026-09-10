import { readLeads } from "@/lib/store";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  // Prefix formula-like values so a downloaded CSV cannot execute a formula
  // if someone opens a submitted value in spreadsheet software.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const leads = await readLeads();
  const headings = [
    "Submitted at",
    "Name",
    "Phone / WhatsApp",
    "Email",
    "Consultation type",
    "Workflow status",
    "Follow-up due",
    "Internal note",
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Source",
    "Referrer",
    "UTM source",
    "UTM medium",
    "UTM campaign",
    "UTM term",
    "UTM content / link code",
    "Landing page",
    "Anonymous visitor ID",
  ];
  const rows = leads
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((lead) => [
      new Date(lead.timestamp).toISOString(),
      lead.fullName,
      lead.phone,
      lead.email,
      lead.consultationType,
      lead.status,
      lead.followUpAt ? new Date(lead.followUpAt).toISOString() : "",
      lead.adminNote,
      lead.q1,
      lead.q2,
      lead.q3,
      lead.q4,
      lead.source,
      lead.referrer,
      lead.utmSource,
      lead.utmMedium,
      lead.utmCampaign,
      lead.utmTerm,
      lead.utmContent,
      lead.landingPath,
      lead.sessionId,
    ]);
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kindred-path-leads-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
