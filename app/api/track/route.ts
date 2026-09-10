import { NextResponse } from "next/server";
import { appendEvent } from "@/lib/store";
import { sanitizeAnalyticsMetadata } from "@/lib/analytics";

export const runtime = "nodejs";

const TRACKABLE_STEPS = new Set([
  "PageViewed",
  "CampaignLinkClicked",
  "LandingView",
  "LandingQuizCtaClicked",
  "LandingPrivacyClicked",
  "QuizStarted",
  "QuizQ1Answered",
  "QuizQ2Viewed",
  "QuizQ2Answered",
  "QuizQ3Viewed",
  "QuizQ3Answered",
  "QuizQ4Viewed",
  "QuizQ4Answered",
  "QuizQ4Skipped",
  "QuizReachedContactForm",
  "QuizContactValidationFailed",
  "QuizContactSubmitStarted",
  "QuizSubmitting",
  "QuizContactSubmitted",
  "QuizContactSubmitFailed",
  "QuizBackToQ1",
  "QuizBackToQ2",
  "QuizBackToQ3",
  "QuizPrivacyClicked",
  "BookingConfirmedView",
  "BookingWhatsAppClicked",
  "BookingBackToHomeClicked",
  "BookingPrivacyClicked",
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { step, sessionId, visitId, path, eventType, metadata } = body ?? {};

    if (typeof step !== "string" || !TRACKABLE_STEPS.has(step)) {
      return NextResponse.json({ ok: false, error: "Unsupported tracking step" }, { status: 400 });
    }

    const safeEventType = step === "PageViewed" && eventType === "page_view" ? "page_view" : "action";

    const saved = await appendEvent({
      id: crypto.randomUUID(),
      sessionId:
        typeof sessionId === "string" && sessionId.length <= 128 ? sessionId : "unknown",
      visitId: typeof visitId === "string" && visitId.length <= 128 ? visitId : "unknown",
      step,
      eventType: safeEventType,
      path:
        typeof path === "string" && path.startsWith("/") ? path.slice(0, 256) : "",
      metadata: sanitizeAnalyticsMetadata(metadata),
      timestamp: Date.now(),
    });

    // Tracking must never turn into a client-visible 500. A 202 tells an
    // operator that storage needs configuring without interrupting the quiz.
    if (!saved) {
      return NextResponse.json({ ok: false, storage: "unavailable" }, { status: 202 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
