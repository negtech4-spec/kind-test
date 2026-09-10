import BrandHeader from "@/components/BrandHeader";
import TrackPageView from "@/components/TrackPageView";
import TrackedQuizCta from "@/components/TrackedQuizCta";
import TrackedLink from "@/components/TrackedLink";

export default function Home() {
  return (
    <main className="screen-shell landing-screen bg-texture flex flex-col px-4 sm:px-6">
      <TrackPageView step="LandingView" />
      <div className="screen-stack mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center">
        <header className="shrink-0 pt-1">
          <BrandHeader />
        </header>

        <section className="flex min-h-0 w-full max-w-2xl flex-1 flex-col items-center justify-center py-3 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-plum-100 bg-white px-4 py-1.5 text-[11px] font-semibold tracking-tight text-plum-600 shadow-soft sm:mb-4 sm:text-xs">
            1st Anniversary · Free consultations in Ikeja
          </span>

          <h1 className="[text-wrap:balance] font-serif text-[clamp(1.6rem,6vw,2.5rem)] font-medium leading-[1.15] text-plum-700">
            A kindred path to the family you&rsquo;re hoping for.
          </h1>

          <p className="mt-3 max-w-xl text-[clamp(0.82rem,2.4vw,1.0625rem)] leading-relaxed text-ink/65 sm:mt-4">
            To celebrate our 1st anniversary at Kindred Path, we are hosting a
            limited number of free, private 30-minute sessions with our{" "}
            <strong className="font-semibold text-ink/75">
              teaching hospital consultants
            </strong>.{" "}
            Meet our university faculty clinicians in person at our Ikeja
            center to get clear, expert medical guidance on your family
            planning journey.
          </p>

          <TrackedQuizCta className="focus-ring mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-plum-600 to-berry px-7 py-3.5 text-[14px] font-semibold text-white shadow-card transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 sm:mt-6 sm:px-8 sm:py-4 sm:text-base" />

          <aside className="mt-3 flex max-w-md items-center gap-2.5 rounded-xl border border-plum-100 bg-white/90 px-3 py-2 text-left shadow-soft animate-fadeUp">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-plum-50 text-plum-600"
              aria-hidden="true"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.9" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-[10px] leading-snug text-ink/50 sm:text-[11px]">
              <span className="font-semibold text-plum-600">A private first step.</span>{" "}
              Four short questions. We only use your details to follow up about your request.
            </p>
          </aside>
        </section>

        <footer className="screen-footer flex w-full max-w-md flex-col items-center gap-1 pt-2 text-center">
          <p className="text-[11px] leading-snug text-ink/40">
            <span className="font-medium text-plum-400">
              Proudly in affiliation with
            </span>{" "}
            Lagos State University Teaching Hospital, Ikeja
          </p>
          <p className="text-[11px] text-ink/35">
            1-5 Oba Akinjobi Street, G.R.A., Ikeja, Lagos ·{" "}
            <TrackedLink
              href="/privacy"
              trackingEvent="LandingPrivacyClicked"
              className="focus-ring underline decoration-ink/15 underline-offset-2 hover:text-plum-600"
            >
              Privacy Policy
            </TrackedLink>
          </p>
        </footer>
      </div>
    </main>
  );
}
