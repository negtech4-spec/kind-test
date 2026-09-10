"use client";

import Script from "next/script";
import { marketingPixelConfig } from "@/lib/marketing-config";
import { useMarketingConsent } from "@/lib/marketing-consent";

export default function MarketingPixels() {
  const consentGranted = useMarketingConsent();
  const usesGoogleTagManager = Boolean(marketingPixelConfig.googleTagManagerId);
  // GTM should own GA4 and Google Ads when it is configured. Loading those
  // tags directly as well would create duplicate page views and conversions.
  const googleIds = usesGoogleTagManager
    ? []
    : [marketingPixelConfig.ga4MeasurementId, marketingPixelConfig.googleAdsId].filter(Boolean);

  if (!consentGranted) return null;

  return (
    <>
      {marketingPixelConfig.googleTagManagerId && (
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
            (function(w,d,s,l,i){var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${marketingPixelConfig.googleTagManagerId}');
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

      {marketingPixelConfig.tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load('${marketingPixelConfig.tiktokPixelId}');ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {marketingPixelConfig.linkedInPartnerId && (
        <Script id="linkedin-insight" strategy="afterInteractive">
          {`
            window._linkedin_partner_id = '${marketingPixelConfig.linkedInPartnerId}';
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(window._linkedin_partner_id);
            (function(l) { if (!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[];}var s=document.getElementsByTagName('script')[0];var b=document.createElement('script');b.type='text/javascript';b.async=true;b.src='https://snap.licdn.com/li.lms-analytics/insight.min.js';s.parentNode.insertBefore(b,s);})(window.lintrk);
          `}
        </Script>
      )}

      {marketingPixelConfig.microsoftUetTagId && (
        <Script id="microsoft-uet" strategy="afterInteractive">
          {`
            (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:'${marketingPixelConfig.microsoftUetTagId}'};o.q=w[u],w[u]=new UET(o),w[u].push('pageLoad')},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=='loaded'&&s!=='complete'||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,'script','https://bat.bing.com/bat.js','uetq');
          `}
        </Script>
      )}
    </>
  );
}
