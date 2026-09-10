"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import { fbTrack } from "@/lib/fbpixel";
import { trackStep } from "@/lib/track-client";

const WHATSAPP_NUMBER = "2349132347955";

export default function BookingConfirmed() {
  const [firstName, setFirstName] = useState("");
  const [consultationType, setConsultationType] = useState<"in_person" | "remote">("in_person");

  useEffect(() => {
    const name = sessionStorage.getItem("kp_lead_name");
    if (name) setFirstName(name);

    if (sessionStorage.getItem("kp_consultation_type") === "remote") {
      setConsultationType("remote");
    }

    trackStep("BookingConfirmedView");

    if (!sessionStorage.getItem("kp_lead_tracked")) {
      fbTrack("Lead", { content_name: "Anniversary Free Consultation Quiz" });
      sessionStorage.setItem("kp_lead_tracked", "1");
    }
  }, []);

  const whatsappMessage = encodeURIComponent(
    consultationType === "remote"
      ? "Hi Kindred Path! I just submitted my details through the anniversary quiz and would like to ask about remote fertility consultation options."
      : "Hi Kindred Path! I just completed the anniversary consultation quiz and would like to confirm my free slot."
  );

  return (
    <main className="screen-shell confirmation-screen bg-texture flex flex-col px-4 sm:px-6">
      <div className="screen-stack mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center">
        <header className="shrink-0 pt-1">
          <BrandHeader />
        </header>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center py-2">
          <div className="screen-card screen-card-compact w-full max-w-lg animate-fadeUp rounded-2xl border border-plum-50 bg-white px-5 py-5 text-center shadow-card sm:px-8 sm:py-6">
            <div
              className={`mx-auto mb-3 inline-flex animate-popIn items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${
                consultationType === "remote" ? "bg-amber-50 text-amber-700" : "bg-plum-50 text-plum-600"
              }`}
              style={{ animationDelay: "150ms" }}
            >
              {consultationType === "remote" ? "You are on the list ✓" : "Your request is received ✓"}
            </div>

            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-plum-50">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12.5 9.5 17 19 7"
                  stroke="#4A1D6E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="screen-question mb-2 font-serif font-medium leading-snug text-plum-700">
              {consultationType === "remote"
                ? firstName
                  ? `Thanks, ${firstName}. You are noted.`
                  : "Thanks. You are noted."
                : firstName
                  ? `You are set, ${firstName}.`
                  : "You are all set."}
            </h1>

            <p className="mx-auto max-w-sm text-[14px] leading-relaxed text-ink/65 sm:text-[15px]">
              {consultationType === "remote"
                ? "Your details have been received. A Kindred Path coordinator will reach out shortly to discuss private remote fertility consultation options with you."
                : "Your request for a free, private fertility consultation has been received. A Kindred Path coordinator will reach out shortly to confirm your exact date and time in Ikeja."}
            </p>

            <div className="mx-auto mt-4 max-w-sm rounded-xl border border-plum-100 bg-plum-50/50 px-4 py-3 text-left">
              {consultationType === "in_person" ? (
                <div className="flex gap-2.5">
                  <svg
                    className="mt-0.5 shrink-0 text-plum-500"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>

                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-plum-500">
                      Visit location
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink/70">
                      1–5 Oba Akinjobi Street, G.R.A., Ikeja, Lagos
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-ink/50">
                      Please wait for your confirmed date and time before visiting.
                    </p>
                  </div>
                </div>
              ) : null}

              <div
                className={`flex gap-2.5 ${
                  consultationType === "in_person" ? "mt-3 border-t border-plum-100 pt-3" : ""
                }`}
              >
                <svg
                  className="mt-0.5 shrink-0 text-plum-500"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="m4 7 8 6 8-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-plum-500">
                    Check your email
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink/60">
                    If you provided an email address, look for our confirmation. If you cannot see it,
                    please check Spam or Promotions and mark it as “Not spam.”
                  </p>
                </div>
              </div>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStep("BookingWhatsAppClicked")}
              className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-[15px] font-semibold text-white shadow-soft transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-card active:translate-y-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.5 3.62 1.44 5.13L2 22l5.13-1.54a9.9 9.9 0 0 0 4.9 1.28h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.05.92.91-2.98-.2-.3a8.2 8.2 0 0 1-1.26-4.5c0-4.53 3.68-8.21 8.1-8.21 4.34 0 7.9 3.68 7.9 8.21 0 4.53-3.56 8.19-7.9 8.19Zm4.47-6.14c-.24-.12-1.44-.71-1.67-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.19-.72-.63-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.19.87 2.34.99 2.5.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
              </svg>
              Chat with us on WhatsApp
            </a>

            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <Link
                href="/"
                onClick={() => trackStep("BookingBackToHomeClicked")}
                className="focus-ring font-medium text-plum-400 transition-colors hover:text-plum-600"
              >
                Back to homepage
              </Link>

              <span className="text-ink/20">·</span>

              <Link
                href="/privacy"
                onClick={() => trackStep("BookingPrivacyClicked")}
                className="focus-ring font-medium text-plum-400 transition-colors hover:text-plum-600"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
