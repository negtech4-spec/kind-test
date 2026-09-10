import { NextResponse } from "next/server";
import { appendLead, type Lead } from "@/lib/store";
import { toLeadAttribution } from "@/lib/analytics";
import {
  buildLeadConfirmationEmail,
  buildTeamNotificationEmail,
  formatFromAddress,
} from "@/lib/email-templates";

export const runtime = "nodejs";

// Always notified when a form is submitted, regardless of env config.
// Override/extend via LEAD_NOTIFICATION_EMAIL (comma-separated) if needed.
const DEFAULT_NOTIFICATION_EMAILS = [
  "info@kindredpathifm.com",
  "operations@kindredpathifm.com",
  "negtech1@gmail.com",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, phone, email, q1, q2, q3, q4, consultationType, sessionId, attribution } =
      body ?? {};

    if (!fullName || !phone) {
      return NextResponse.json(
        { ok: false, error: "Full name and phone are required." },
        { status: 400 }
      );
    }

    const lead: Lead = {
      id: crypto.randomUUID(),
      sessionId: typeof sessionId === "string" ? sessionId : "unknown",
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : null,
      q1: q1 ?? null,
      q2: q2 ?? null,
      q3: q3 ?? null,
      q4: q4 ?? null,
      consultationType: consultationType === "remote" ? "remote" : "in_person",
      ...toLeadAttribution(attribution),
      status: "new",
      adminNote: null,
      followUpAt: null,
      updatedAt: Date.now(),
      timestamp: Date.now(),
    };

    const saved = await appendLead(lead);
    if (!saved) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Lead storage is not configured. Please try again shortly or contact us on WhatsApp.",
        },
        { status: 503 }
      );
    }

    // Email notifications via Resend. Runs as long as RESEND_API_KEY is set;
    // internal notification always goes out to the team addresses above.
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromAddress = formatFromAddress(
          process.env.RESEND_FROM_EMAIL || "hello@send.ifmkindredpathfertilitycentre.com"
        );
        const notifyEmails = process.env.LEAD_NOTIFICATION_EMAIL
          ? process.env.LEAD_NOTIFICATION_EMAIL.split(",").map((e) => e.trim()).filter(Boolean)
          : DEFAULT_NOTIFICATION_EMAILS;

        const teamEmail = buildTeamNotificationEmail(lead);
        await resend.emails.send({
          from: fromAddress,
          to: notifyEmails,
          subject: teamEmail.subject,
          text: teamEmail.text,
          html: teamEmail.html,
        });

        // Branded confirmation to the lead, only if they gave an email.
        if (lead.email) {
          const confirmationEmail = buildLeadConfirmationEmail(lead);
          await resend.emails.send({
            from: fromAddress,
            to: lead.email,
            subject: confirmationEmail.subject,
            text: confirmationEmail.text,
            html: confirmationEmail.html,
          });
        }
      } catch (emailError) {
        // Never fail the lead capture just because email delivery failed.
        console.error("Resend email failed:", emailError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
