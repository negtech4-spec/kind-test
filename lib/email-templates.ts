import type { Lead } from "@/lib/store";

const WHATSAPP_NUMBER = process.env.KINDRED_PATH_WHATSAPP_NUMBER || "2349132347955";

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "Not provided")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-NG", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

function answerLabel(key: "q1" | "q2" | "q3" | "q4", value: string | null) {
  const labels: Record<string, Record<string, string>> = {
    q1: {
      grow: "Start or grow our family",
      checkup: "General reproductive health checkup",
      info: "General information",
    },
    q2: { "<1": "Less than 1 year", "1-3": "1 to 3 years", ">3": "Over 3 years" },
    q3: { yes: "Can physically visit Ikeja", no: "Cannot visit physically" },
    q4: {
      morning: "Morning (8am–12pm)",
      afternoon: "Afternoon (12pm–4pm)",
      evening: "Evening (4pm–8pm)",
      anytime: "Anytime",
    },
  };
  return value ? labels[key][value] ?? value : "Not provided";
}

function detailRow(label: string, value: string) {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #eee8f3;color:#7e4cab;font-size:12px;font-weight:700;letter-spacing:.02em;width:42%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #eee8f3;color:#241233;font-size:14px;line-height:1.45">${escapeHtml(value)}</td></tr>`;
}

function publicAssetUrl(assetPath: string) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (!configured) return null;
  const origin = configured.startsWith("http") ? configured : `https://${configured}`;
  return `${origin}${assetPath}`;
}

/**
 * Email clients need absolute asset URLs. If a deployment URL has not been
 * configured yet, text fallbacks still preserve the partnership identity.
 */
function partnershipLockup() {
  const kindredLogo = publicAssetUrl("/images/email-kindredpath-logo.png");
  const lasuthLogo = publicAssetUrl("/images/email-lasuth-logo.png");
  const kindred = kindredLogo
    ? `<img src="${escapeHtml(kindredLogo)}" width="142" alt="Kindred Path Fertility Centre" style="display:block;width:142px;max-width:142px;height:auto;border:0;outline:none;text-decoration:none">`
    : `<span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#4a1d6e">Kindred Path</span>`;
  const lasuth = lasuthLogo
    ? `<img src="${escapeHtml(lasuthLogo)}" width="48" height="48" alt="IFM LASUTH" style="display:block;width:48px;height:48px;border:0;border-radius:50%;outline:none;text-decoration:none">`
    : `<span style="font-size:11px;font-weight:700;color:#241233">IFM LASUTH</span>`;

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle">${kindred}</td>
    <td style="padding:0 14px;vertical-align:middle;font-family:Georgia,serif;font-size:25px;line-height:1;color:#b78742">×</td>
    <td style="vertical-align:middle">${lasuth}</td>
  </tr></table>`;
}

function shell({
  eyebrow,
  title,
  intro,
  body,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
}) {
  return `<!doctype html>
<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;background:#f7f5fa;font-family:Arial,Helvetica,sans-serif;color:#241233">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5fa;padding:30px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ece4f3">
      <tr><td style="background:#ffffff;padding:20px 30px 18px;border-bottom:1px solid #eee8f3">
        ${partnershipLockup()}
      </td></tr>
      <tr><td style="background:#4a1d6e;padding:19px 30px;color:#ffffff">
        <div style="font-size:11px;letter-spacing:.14em;font-weight:700;opacity:.76">KINDRED PATH FERTILITY CENTRE × IFM LASUTH</div>
        <div style="font-family:Georgia,serif;font-size:25px;line-height:1.2;font-weight:400;margin-top:8px">${escapeHtml(eyebrow)}</div>
      </td></tr>
      <tr><td style="padding:30px">
        <h1 style="font-family:Georgia,serif;font-size:27px;line-height:1.2;font-weight:400;color:#3b1758;margin:0 0 10px">${escapeHtml(title)}</h1>
        <p style="font-size:15px;line-height:1.6;color:#5d5368;margin:0 0 24px">${escapeHtml(intro)}</p>
        ${body}
      </td></tr>
      <tr><td style="background:#fbf9fd;border-top:1px solid #eee8f3;padding:19px 30px;color:#81778c;font-size:11px;line-height:1.55">
        Kindred Path Fertility Centre × IFM LASUTH · 1–5 Oba Akinjobi Street, G.R.A., Ikeja, Lagos<br>
        Please treat consultation information as private and confidential.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function formatFromAddress(address: string) {
  return address.includes("<") ? address : `Kindred Path Fertility Centre <${address}>`;
}

export function buildTeamNotificationEmail(lead: Lead) {
  const remote = lead.consultationType === "remote";
  const typeLabel = remote ? "Remote follow-up request" : "In-person consultation request";
  const phone = whatsappDigits(lead.phone);
  const whatsappMessage = encodeURIComponent(
    `Hello ${lead.fullName.split(" ")[0] || "there"}, thank you for contacting Kindred Path. We are following up on your consultation request.`
  );
  const source = lead.utmCampaign
    ? `${lead.source || "Direct"} · ${lead.utmCampaign}`
    : lead.source || lead.referrer || "Direct / unknown";
  const rows = [
    detailRow("Full name", lead.fullName),
    detailRow("WhatsApp / phone", lead.phone),
    detailRow("Email", lead.email || "Not provided"),
    detailRow("Request type", typeLabel),
    detailRow("Preferred WhatsApp time", answerLabel("q4", lead.q4)),
    detailRow("Source", source),
    detailRow("Submitted", formatDate(lead.timestamp)),
  ].join("");
  const answers = [
    detailRow("Primary focus", answerLabel("q1", lead.q1)),
    detailRow("Journey duration", answerLabel("q2", lead.q2)),
    detailRow("Ikeja visit", answerLabel("q3", lead.q3)),
  ].join("");

  return {
    subject: `New ${remote ? "remote follow-up" : "consultation"} request: ${lead.fullName}`,
    text: [
      `New ${typeLabel}`,
      `Name: ${lead.fullName}`,
      `Phone: ${lead.phone}`,
      `Email: ${lead.email ?? "Not provided"}`,
      `Preferred WhatsApp time: ${answerLabel("q4", lead.q4)}`,
      `Source: ${source}`,
      `Submitted: ${formatDate(lead.timestamp)}`,
      "",
      `Primary focus: ${answerLabel("q1", lead.q1)}`,
      `Journey duration: ${answerLabel("q2", lead.q2)}`,
      `Ikeja visit: ${answerLabel("q3", lead.q3)}`,
    ].join("\n"),
    html: shell({
      eyebrow: "New request received",
      title: remote ? "A remote follow-up request is ready." : "A new consultation request is ready.",
      intro: "A visitor has completed the Kindred Path consultation form. Please follow up promptly and keep these details confidential.",
      body: `
        <div style="display:inline-block;background:${remote ? "#fff7e7" : "#f5f0fa"};color:${remote ? "#9a6700" : "#5b2e8c"};padding:7px 11px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:18px">${escapeHtml(typeLabel)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>
        <div style="margin:22px 0 18px">
          <a href="https://wa.me/${phone}?text=${whatsappMessage}" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:700;margin-right:8px">Reply on WhatsApp</a>
          <a href="tel:${phone}" style="display:inline-block;border:1px solid #d9c9e8;color:#4a1d6e;text-decoration:none;padding:11px 16px;border-radius:10px;font-size:14px;font-weight:700">Call lead</a>
        </div>
        <div style="margin-top:22px;padding-top:20px;border-top:1px solid #eee8f3">
          <p style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7e4cab;margin:0 0 7px">Context for follow-up</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${answers}</table>
        </div>`,
    }),
  };
}

export function buildLeadConfirmationEmail(lead: Lead) {
  const firstName = lead.fullName.trim().split(" ")[0] || "there";
  const remote = lead.consultationType === "remote";
  const whatsappMessage = encodeURIComponent(
    "Hello Kindred Path, I have submitted my consultation request and would like to ask a question."
  );
  const title = remote ? "Your request is with us." : "We have received your request.";
  const intro = remote
    ? `Thank you, ${firstName}. A Kindred Path coordinator will follow up with you about the right consultation options.`
    : `Thank you, ${firstName}. A Kindred Path coordinator will follow up shortly to confirm your consultation details in Ikeja.`;

  return {
    subject: remote ? "We have received your Kindred Path request" : "Your Kindred Path consultation request",
    text: `${title}\n\n${intro}\n\nWhat happens next:\n1. A coordinator reviews your request.\n2. We contact you by WhatsApp or phone.\n3. We confirm the appropriate next step.\n\nFor questions, message us on WhatsApp: https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`,
    html: shell({
      eyebrow: "Kindred Path consultation",
      title,
      intro,
      body: `
        <div style="background:#f9f6fc;border-radius:14px;padding:19px 20px">
          <p style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7e4cab;margin:0 0 10px">What happens next</p>
          <ol style="margin:0;padding-left:20px;color:#4f4659;font-size:14px;line-height:1.7">
            <li>A coordinator reviews your request.</li>
            <li>We contact you by WhatsApp or phone.</li>
            <li>We confirm the appropriate next step with you.</li>
          </ol>
        </div>
        <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#5d5368">If you have a question before then, you can message us directly.</p>
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}" style="display:inline-block;margin-top:13px;background:#25d366;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:700">Message us on WhatsApp</a>`,
    }),
  };
}
