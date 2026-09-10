"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import OptionCard from "@/components/OptionCard";
import ProgressBar from "@/components/ProgressBar";
import { fbTrackCustom } from "@/lib/fbpixel";
import {
  getSessionId,
  getTrafficAttribution,
  trackMarketingLead,
  trackStep,
} from "@/lib/track-client";

type Stage = "q1" | "q2" | "q3" | "q4" | "contact" | "loading";

const TOTAL_QUESTIONS = 4;
const CONFIRMATION_LOADING_MS = 10_000;

const STAGE_EVENTS: Record<Stage, string> = {
  q1: "QuizStarted",
  q2: "QuizQ2Viewed",
  q3: "QuizQ3Viewed",
  q4: "QuizQ4Viewed",
  contact: "QuizReachedContactForm",
  loading: "QuizSubmitting",
};

const LOADING_STEPS = [
  {
    title: "Saving your details securely",
    description: "Your private request is being saved safely.",
  },
  {
    title: "Adding your request to the queue",
    description: "The Kindred Path team will be able to follow up with you.",
  },
  {
    title: "Preparing your next step",
    description: "We are getting your confirmation ready.",
  },
  {
    title: "Almost ready",
    description: "Please keep this page open for just a moment.",
  },
];

export default function QuizPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("q1");
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [q3, setQ3] = useState<string | null>(null);
  const [q4, setQ4] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(5);
  const [loadingComplete, setLoadingComplete] = useState(false);

  const consultationType: "in_person" | "remote" =
    q3 === "no" ? "remote" : "in_person";
  const stepNumber =
    stage === "q1" ? 1 : stage === "q2" ? 2 : stage === "q3" ? 3 : 4;
  const activeLoadingStep = LOADING_STEPS[loadingStep] ?? LOADING_STEPS[0];
  useEffect(() => {
    const trackedEvent = STAGE_EVENTS[stage];
    trackStep(trackedEvent);
    fbTrackCustom(trackedEvent);
  }, [stage]);

  useEffect(() => {
    if (stage !== "loading" || loadingComplete) return;

    const startedAt = Date.now();
    setLoadingStep(0);
    setLoadingProgress(5);

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(
        96,
        Math.max(5, Math.round((elapsed / CONFIRMATION_LOADING_MS) * 96))
      );
      const nextStep = Math.min(
        Math.floor((elapsed / CONFIRMATION_LOADING_MS) * LOADING_STEPS.length),
        LOADING_STEPS.length - 1
      );

      setLoadingProgress(progress);
      setLoadingStep(nextStep);
    };

    tick();
    const interval = window.setInterval(() => {
      tick();
    }, 100);

    return () => window.clearInterval(interval);
  }, [stage, loadingComplete]);

  function handleQ1(value: string) {
    setQ1(value);
    trackStep("QuizQ1Answered");
    setStage("q2");
  }

  function handleQ2(value: string) {
    setQ2(value);
    trackStep("QuizQ2Answered");
    setStage("q3");
  }

  function handleQ3(value: string) {
    setQ3(value);
    trackStep("QuizQ3Answered");
    setStage("q4");
  }

  function handleQ4(value: string | null) {
    setQ4(value);
    trackStep(value ? "QuizQ4Answered" : "QuizQ4Skipped");
    setStage("contact");
  }

  function goBack(nextStage: "q1" | "q2" | "q3") {
    const eventByTarget = {
      q1: "QuizBackToQ1",
      q2: "QuizBackToQ2",
      q3: "QuizBackToQ3",
    } as const;
    trackStep(eventByTarget[nextStage]);
    setStage(nextStage);
  }

  function validate() {
    const next: { name?: string; phone?: string } = {};
    if (fullName.trim().length < 2) {
      next.name = "Please enter your full name.";
    }
    if (phone.replace(/[^\d]/g, "").length < 10) {
      next.phone = "Please enter a valid WhatsApp or phone number.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) {
      trackStep("QuizContactValidationFailed");
      return;
    }

    trackStep("QuizContactSubmitStarted");
    setSubmitError("");
    setLoadingComplete(false);
    setStage("loading");

    const minDelay = new Promise((resolve) =>
      window.setTimeout(resolve, CONFIRMATION_LOADING_MS)
    );
    const submit = (async () => {
      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            phone,
            email: email || undefined,
            q1,
            q2,
            q3,
            q4,
            consultationType,
            sessionId: getSessionId(),
            attribution: getTrafficAttribution(),
          }),
        });
        return { ok: response.ok };
      } catch {
        return { ok: false };
      }
    })();

    const [, result] = await Promise.all([minDelay, submit]);

    if (result.ok) {
      setLoadingComplete(true);
      setLoadingProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      trackStep("QuizContactSubmitted");
      trackMarketingLead();

      sessionStorage.setItem("kp_lead_name", fullName.trim().split(" ")[0]);
      sessionStorage.setItem("kp_lead_tracked", "1");
      sessionStorage.setItem("kp_consultation_type", consultationType);
      router.push("/booking-confirmed");
      return;
    }

    trackStep("QuizContactSubmitFailed");
    setStage("contact");
    setSubmitError(
      "We could not save your details just now. Please try again, or message us directly on WhatsApp."
    );
  }

  return (
    <main className="screen-shell quiz-screen bg-texture flex flex-col px-4 sm:px-6">
      <div className="screen-stack mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center">
        <header className="shrink-0 pt-1">
          <BrandHeader />
        </header>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center py-2">
          <div className="screen-card screen-card-compact w-full max-w-lg animate-fadeUp rounded-2xl border border-plum-50 bg-white px-4 py-4 shadow-card sm:px-8 sm:py-6">
            {stage !== "contact" && stage !== "loading" && (
              <div className="mb-4">
                <ProgressBar step={stepNumber} total={TOTAL_QUESTIONS} />
              </div>
            )}

            {stage === "q1" && (
              <fieldset key="q1" className="animate-fadeUp">
                <legend className="screen-question mb-3 font-serif font-medium leading-snug text-plum-700 sm:mb-4">
                  What is your primary family planning or wellness focus right now?
                </legend>
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  <OptionCard
                    name="q1"
                    label="We want to start or grow our family."
                    selected={q1 === "grow"}
                    onSelect={() => handleQ1("grow")}
                  />
                  <OptionCard
                    name="q1"
                    label="We want a general reproductive health checkup."
                    selected={q1 === "checkup"}
                    onSelect={() => handleQ1("checkup")}
                  />
                  <OptionCard
                    name="q1"
                    label="Just looking for general information."
                    selected={q1 === "info"}
                    onSelect={() => handleQ1("info")}
                  />
                </div>
              </fieldset>
            )}

            {stage === "q2" && (
              <fieldset key="q2" className="animate-fadeUp">
                <legend className="screen-question mb-3 font-serif font-medium leading-snug text-plum-700 sm:mb-4">
                  How long have you been actively on your journey to parenthood?
                </legend>
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  <OptionCard
                    name="q2"
                    label="Less than 1 year."
                    selected={q2 === "<1"}
                    onSelect={() => handleQ2("<1")}
                  />
                  <OptionCard
                    name="q2"
                    label="1 to 3 years."
                    selected={q2 === "1-3"}
                    onSelect={() => handleQ2("1-3")}
                  />
                  <OptionCard
                    name="q2"
                    label="Over 3 years."
                    selected={q2 === ">3"}
                    onSelect={() => handleQ2(">3")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => goBack("q1")}
                  className="focus-ring mt-3 text-sm font-medium text-plum-400 transition-colors hover:text-plum-600"
                >
                  ← Back
                </button>
              </fieldset>
            )}

            {stage === "q3" && (
              <fieldset key="q3" className="animate-fadeUp">
                <legend className="screen-question mb-1.5 font-serif font-medium leading-snug text-plum-700 sm:mb-2">
                  Can you physically visit the clinic in Ikeja?
                </legend>
                <p className="screen-helper mb-3 leading-relaxed text-plum-400 sm:mb-4">
                  Free anniversary consultations happen in person at our Ikeja, Lagos clinic. If you cannot visit, that is still fine. We will follow up in the right way.
                </p>
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  <OptionCard
                    name="q3"
                    label="Yes, I can physically visit the clinic in Ikeja."
                    selected={q3 === "yes"}
                    onSelect={() => handleQ3("yes")}
                  />
                  <OptionCard
                    name="q3"
                    label="No, I am outside Lagos / cannot visit physically."
                    selected={q3 === "no"}
                    onSelect={() => handleQ3("no")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => goBack("q2")}
                  className="focus-ring mt-3 text-sm font-medium text-plum-400 transition-colors hover:text-plum-600"
                >
                  ← Back
                </button>
              </fieldset>
            )}

            {stage === "q4" && (
              <fieldset key="q4" className="animate-fadeUp">
                <div className="mb-1.5 inline-flex items-center gap-2 rounded-full bg-plum-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-plum-500">
                  Optional
                </div>
                <legend className="screen-question mb-3 font-serif font-medium leading-snug text-plum-700 sm:mb-4">
                  What is the best time to reach you on WhatsApp?
                </legend>
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  <OptionCard
                    name="q4"
                    label="Morning (8am – 12pm)"
                    selected={q4 === "morning"}
                    onSelect={() => handleQ4("morning")}
                  />
                  <OptionCard
                    name="q4"
                    label="Afternoon (12pm – 4pm)"
                    selected={q4 === "afternoon"}
                    onSelect={() => handleQ4("afternoon")}
                  />
                  <OptionCard
                    name="q4"
                    label="Evening (4pm – 8pm)"
                    selected={q4 === "evening"}
                    onSelect={() => handleQ4("evening")}
                  />
                  <OptionCard
                    name="q4"
                    label="Anytime"
                    selected={q4 === "anytime"}
                    onSelect={() => handleQ4("anytime")}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goBack("q3")}
                    className="focus-ring text-sm font-medium text-plum-400 transition-colors hover:text-plum-600"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQ4(null)}
                    className="focus-ring text-sm font-medium text-plum-400 transition-colors hover:text-plum-600"
                  >
                    Skip →
                  </button>
                </div>
              </fieldset>
            )}

            {stage === "contact" && (
              <div key="contact" className="animate-fadeUp">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-plum-50 px-3 py-1 text-xs font-semibold text-plum-600">
                  Last step
                </div>
                <h2 className="screen-question mb-1.5 font-serif font-medium leading-snug text-plum-700">
                  Enter your details to complete your request
                </h2>
                <p className="screen-helper mb-3 leading-relaxed text-ink/70 sm:mb-4">
                  We will follow up to confirm your consultation details.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-2.5" noValidate>
                  <div>
                    <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-plum-700">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(input) => setFullName(input.target.value)}
                      placeholder="e.g. Chidinma Okafor"
                      className={`focus-ring w-full rounded-xl border px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink/30 ${
                        errors.name ? "border-red-300" : "border-plum-100"
                      }`}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-1 block text-sm font-medium text-plum-700">
                      WhatsApp or Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(input) => setPhone(input.target.value)}
                      placeholder="e.g. 0803 123 4567"
                      className={`focus-ring w-full rounded-xl border px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink/30 ${
                        errors.phone ? "border-red-300" : "border-plum-100"
                      }`}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-plum-700">
                      Email <span className="font-normal text-ink/40">(optional)</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(input) => setEmail(input.target.value)}
                      placeholder="e.g. chidinma@email.com"
                      className="focus-ring w-full rounded-xl border border-plum-100 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink/30"
                    />
                    <p className="mt-1 text-[11px] leading-snug text-ink/40">
                      We will follow up by WhatsApp either way; email simply gives you a written copy too.
                    </p>
                  </div>
                  {submitError && <p className="text-center text-xs text-red-500">{submitError}</p>}
                  <button
                    type="submit"
                    className="focus-ring mt-0.5 rounded-xl bg-gradient-to-r from-plum-600 to-berry px-6 py-2.5 text-[15px] font-semibold text-white shadow-soft transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-card active:translate-y-0"
                  >
                    Complete My Request
                  </button>
                  <p className="text-center text-[11px] leading-snug text-ink/40">
                    Your details are only used to follow up about your consultation. See our{" "}
                    <Link
                      href="/privacy"
                      onClick={() => trackStep("QuizPrivacyClicked")}
                      className="underline decoration-ink/15 underline-offset-2 hover:text-plum-600"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              </div>
            )}

            {stage === "loading" && (
              <div key="loading" className="animate-fadeUp py-1 text-center" role="status" aria-live="polite">
                <div
                  className="relative mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full p-[5px] shadow-soft transition-[background] duration-700"
                  style={{
                    background: `conic-gradient(#4A1D6E ${loadingProgress}%, #F5F0FA ${loadingProgress}% 100%)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-white">
                    {loadingProgress >= 100 ? (
                      <svg width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                        <path d="M8 16.5 13 21l11-11" stroke="#4A1D6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className="animate-spin" width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                        <path d="M16 4a12 12 0 1 1-8.49 3.51" stroke="#4A1D6E" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-plum-400">
                  Completing your request
                </p>
                <h2 className="mt-2 font-serif text-xl font-medium text-plum-700">
                  {activeLoadingStep.title}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink/60">
                  {activeLoadingStep.description}
                </p>
                <p className="mt-2 text-[11px] text-ink/40">
                  This takes about 10 seconds.
                </p>
                <div className="mx-auto mt-5 max-w-sm space-y-2.5 text-left">
                  {LOADING_STEPS.map((item, index) => {
                    const complete = index < loadingStep;
                    const active = index === loadingStep;
                    return (
                      <div key={item.title} className="flex items-center gap-2.5">
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                            complete || active ? "bg-plum-600 text-white" : "bg-plum-50 text-plum-300"
                          }`}
                        >
                          {complete ? "✓" : index + 1}
                        </span>
                        <span className={`text-xs transition-colors duration-300 ${active ? "font-semibold text-plum-700" : "text-ink/45"}`}>
                          {item.title}
                        </span>
                        {active && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-berry" aria-hidden="true" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="screen-footer max-w-xs pt-2 text-center text-[11px] leading-relaxed text-ink/35">
          Kindred Path, in affiliation with Lagos State University Teaching Hospital, Ikeja. 1-5 Oba Akinjobi Street, G.R.A., Ikeja, Lagos. ·{" "}
          <Link
            href="/privacy"
            onClick={() => trackStep("QuizPrivacyClicked")}
            className="underline decoration-ink/15 underline-offset-2 hover:text-plum-600"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </main>
  );
}
