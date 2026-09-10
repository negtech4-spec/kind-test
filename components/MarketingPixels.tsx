"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { fbPageView } from "@/lib/fbpixel";
import { marketingPixelConfig } from "@/lib/marketing-config";
import { useMarketingConsent } from "@/lib/marketing-consent";
import { sanitizeTrackingSettings, type TrackingSettings } from "@/lib/tracking-settings";

function runtimeSettings(saved: TrackingSettings) {
  // A saved admin configuration is authoritative, including an intentional
  // blank value used to turn a previously configured tag off.
  return saved.updatedAt > 0 ? saved : marketingPixelConfig;
}

export default function MarketingPixels() {
  const consentGranted = useMarketingConsent();
  const [settings, setSettings] = useState<TrackingSettings>(marketingPixelConfig);
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/tracking-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (!mounted || !payload || typeof payload !== "object") return;
        const value = payload as { settings?: unknown };
        const next = runtimeSettings(sanitizeTrackingSettings(value.settings));
        setSettings(next);
        window.__kpTrackingConfig = next;
      })
      .catch(() => {
        // The site still uses private environment fallback values if configured.
      })
      .finally(() => {
        if (mounted) setConfigReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    window.__kpTrackingConfig = settings;
  }, [settings]);

  // GTM should own GA4 and Google Ads when it is configured. Loading them
  // directly as well would create duplicate page views and conversions.
  const googleIds = settings.googleTagManagerId
    ? []
    : [settings.ga4MeasurementId, settings.googleAdsId].filter(Boolean);

  if (!consentGranted || !configReady) return null;

  return (
    <>
      {settings.metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive" onReady={fbPageView}>
          {`
            !function(f,b,e,v,n,t,s){
              if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${settings.metaPixelId}');
          `}
        </Script>
      )}

      {settings.googleTagManagerId && (
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
            (function(w,d,s,l,i){var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${settings.googleTagManagerId}');
          `}
        </Script>
      )}

      {googleIds.length > 0 && (
        <>
          <Script
            id="google-tag-base"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleIds[0]}`}
            strategy="afterInteractive"
          />
          <Script id="google-tag-config" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${googleIds.map((id) => `gtag('config', '${id}', { send_page_view: true });`).join("\n")}
            `}
          </Script>
        </>
      )}

      {settings.tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load('${settings.tiktokPixelId}');ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {settings.linkedInPartnerId && (
        <Script id="linkedin-insight" strategy="afterInteractive">
          {`
            window._linkedin_partner_id = '${settings.linkedInPartnerId}';
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(window._linkedin_partner_id);
            (function(l) { if (!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[];}var s=document.getElementsByTagName('script')[0];var b=document.createElement('script');b.type='text/javascript';b.async=true;b.src='https://snap.licdn.com/li.lms-analytics/insight.min.js';s.parentNode.insertBefore(b,s);})(window.lintrk);
          `}
        </Script>
      )}

      {settings.microsoftUetTagId && (
        <Script id="microsoft-uet" strategy="afterInteractive">
          {`
            (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:'${settings.microsoftUetTagId}'};o.q=w[u],w[u]=new UET(o),w[u].push('pageLoad')},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=='loaded'&&s!=='complete'||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,'script','https://bat.bing.com/bat.js','uetq');
          `}
        </Script>
      )}

      {settings.clarityProjectId && (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, 'clarity', 'script', '${settings.clarityProjectId}');
          `}
        </Script>
      )}
    </>
  );
}
