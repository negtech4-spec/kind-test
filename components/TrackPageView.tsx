"use client";

import { useEffect } from "react";
import { trackStep } from "@/lib/track-client";
import { fbTrackCustom } from "@/lib/fbpixel";

export default function TrackPageView({ step }: { step: string }) {
  useEffect(() => {
    trackStep(step);
    fbTrackCustom(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
