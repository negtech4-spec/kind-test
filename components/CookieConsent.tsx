"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hasMarketingPixels } from "@/lib/marketing-config";
import { getMarketingConsent, setMarketingConsent } from "@/lib/marketing-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(hasMarketingPixels && !getMarketingConsent());
  }, []);

  if (!visible) return null;

  function choose(value: "granted" | "denied") {
    setMarketingConsent(value);
    setVisible(false);
  }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-plum-100 bg-white p-4 shadow-card sm:inset-x-auto sm:right-5 sm:w-[30rem]">
      <p className="text-sm font-semibold text-plum-700">Your privacy choices</p>
      <p className="mt-1 text-xs leading-relaxed text-ink/60">
        Anonymous first-party analytics stay on to help us improve the site. Marketing pixels load
        only if you allow them. See our{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-plum-600">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose("granted")}
          className="focus-ring rounded-lg bg-plum-600 px-3.5 py-2 text-xs font-semibold text-white"
        >
          Allow marketing pixels
        </button>
        <button
          type="button"
          onClick={() => choose("denied")}
          className="focus-ring rounded-lg border border-plum-100 px-3.5 py-2 text-xs font-semibold text-plum-600"
        >
          Use essential only
        </button>
      </div>
    </aside>
  );
}
