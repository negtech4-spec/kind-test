import { marketingPixelConfig } from "@/lib/marketing-config";
import type { TrackingSettings } from "@/lib/tracking-settings";

declare global {
  interface Window {
    __kpTrackingConfig?: TrackingSettings;
  }
}

export function activeTrackingSettings(): TrackingSettings {
  if (typeof window !== "undefined" && window.__kpTrackingConfig) {
    return window.__kpTrackingConfig;
  }
  return marketingPixelConfig;
}
