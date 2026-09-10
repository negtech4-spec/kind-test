"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trackStep } from "@/lib/track-client";

export default function TrackedQuizCta({ className }: { className: string }) {
  const [href, setHref] = useState("/quiz");

  useEffect(() => {
    const carried = new URLSearchParams();
    const searchParams = new URLSearchParams(window.location.search);
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "kp_link",
    ]) {
      const value = searchParams.get(key);
      if (value) carried.set(key, value);
    }
    if (carried.size) setHref(`/quiz?${carried.toString()}`);
  }, []);

  return (
    <Link
      href={href}
      onClick={() => trackStep("LandingQuizCtaClicked")}
      className={className}
    >
      Start Free 30-Sec Pre-Qualification Quiz
    </Link>
  );
}
