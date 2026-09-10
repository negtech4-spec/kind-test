"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "kp_marketing_consent";
const CONSENT_EVENT = "kp-marketing-consent";

export type MarketingConsent = "granted" | "denied" | null;

export function getMarketingConsent(): MarketingConsent {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function setMarketingConsent(value: Exclude<MarketingConsent, null>) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // A browser that blocks storage simply remains on essential analytics.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function useMarketingConsent() {
  const [consent, setConsent] = useState<MarketingConsent>(null);

  useEffect(() => {
    const sync = () => setConsent(getMarketingConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  return consent === "granted";
}
