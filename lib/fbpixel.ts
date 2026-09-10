/**
 * Thin wrapper around window.fbq. Every call is guarded so nothing throws
 * if the Pixel hasn't loaded yet (ad blockers, slow network, consent not
 * yet given, etc).
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    __kpLastMetaPage?: string;
  }
}

/** Fire a route-change PageView (the base snippet only fires the first one). */
export function fbPageView() {
  if (typeof window !== "undefined" && window.fbq) {
    const path = window.location.pathname;
    if (window.__kpLastMetaPage === path) return;
    window.__kpLastMetaPage = path;
    window.fbq("track", "PageView");
  }
}

/** Fire a standard Meta event, e.g. "Lead", "CompleteRegistration". */
export function fbTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, params);
  }
}

/**
 * Fire a custom (non-standard) event. Use this for funnel-step tracking
 * like quiz progress, so it never gets confused with a real conversion
 * event in Ads Manager.
 */
export function fbTrackCustom(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("trackCustom", event, params);
  }
}
