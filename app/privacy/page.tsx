import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";

export const metadata = {
  title: "Privacy Notice | Kindred Path",
};

export default function PrivacyPolicy() {
  return (
    <main className="bg-texture min-h-screen px-5 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 flex justify-center">
          <BrandHeader />
        </div>

        <div className="rounded-2xl border border-plum-50 bg-white px-6 py-8 shadow-card sm:px-10 sm:py-10">
          <h1 className="mb-6 font-serif text-2xl font-medium text-plum-700 sm:text-3xl">
            Privacy Notice
          </h1>

          <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-ink/75">
            <p>
              Kindred Path respects your privacy. This page explains how we
              handle information submitted through this site.
            </p>

            <div>
              <h2 className="mb-1.5 font-semibold text-plum-700">
                What we collect
              </h2>
              <p>
                When you complete the private consultation check, we collect
                your full name, phone or WhatsApp number, and the answers you
                select. We do not ask for or store medical records, diagnoses,
                or detailed health history on this site.
              </p>
            </div>

            <div>
              <h2 className="mb-1.5 font-semibold text-plum-700">
                How we use it
              </h2>
              <p>
                We use your details only to respond to your consultation
                request and support the appropriate next step at our Ikeja
                center. We do not sell your information or share it for
                unrelated marketing.
              </p>
            </div>

            <div>
              <h2 className="mb-1.5 font-semibold text-plum-700">
                Analytics and advertising
              </h2>
              <p>
                We use a randomly generated browser session identifier to
                understand page visits, traffic source, device type, check
                progress, and general button interactions. We may retain the
                source, campaign, and short-link code from a tracked campaign
                URL, but not full query strings. Check answers, names, phone
                numbers, and email addresses are not included in these
                analytics events.
              </p>
              <p>
                If enabled by Kindred Path, optional marketing tools such as
                Meta, Google, TikTok, LinkedIn, Microsoft advertising tags or
                session-insight tools load only after you choose to allow
                marketing pixels. These tools receive general page and
                conversion events only. We do not send consultation answers or
                contact details to them. You can choose essential-only use from
                the privacy banner whenever it appears.
              </p>
            </div>

            <div>
              <h2 className="mb-1.5 font-semibold text-plum-700">
                Your choices
              </h2>
              <p>
                You can ask us to access, correct, or delete the information
                you&rsquo;ve submitted at any time by contacting us using the
                details below.
              </p>
            </div>

            <div>
              <h2 className="mb-1.5 font-semibold text-plum-700">
                Contact us
              </h2>
              <p>
                For any privacy questions, reach us via the WhatsApp link on
                this site, or by post at Kindred Path, 1-5 Oba Akinjobi
                Street, G.R.A., Ikeja, Lagos.
              </p>
            </div>

            <p className="text-xs text-ink/40">Last updated: September 2026.</p>
          </div>

          <Link
            href="/"
            className="focus-ring mt-8 inline-block text-sm font-medium text-plum-400 transition-colors hover:text-plum-600"
          >
            ← Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
