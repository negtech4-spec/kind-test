# Kindred Path anniversary quiz

The quiz has separate full-screen stages: landing page, four questions, contact form, loading state, and confirmation. Its confirmation sequence stays visible for at least 10 seconds while the request is saved, so visitors see a clear progress experience instead of an abrupt jump. It is designed to fit the visible mobile viewport without page scrolling; very short viewports automatically use a more compact layout.

## Run locally

Use Node.js 20.9 or later. On Vercel, select Node.js 20.x or a newer supported runtime.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set both a long `ADMIN_PASSWORD` and a random `ADMIN_SESSION_SECRET` (at least 32 characters) in `.env.local` before using `/admin`. You can generate a session secret with:

```bash
openssl rand -base64 48
```

## Production storage (required)

Local development can use `data/*.json`. A serverless deployment must use Supabase so leads and event history are never lost:

1. Create a Supabase project.
2. Open its SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the production environment.
4. Set a strong `ADMIN_PASSWORD` and a unique `ADMIN_SESSION_SECRET` in the production environment.
5. Set `NEXT_PUBLIC_SITE_URL` to the live quiz URL so the email logos and generated campaign links use the correct branded domain.

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or put it in browser code.

If persistent storage is not configured on a serverless host, the admin page shows a clear setup message instead of throwing an application error, and the lead endpoint declines the submission instead of falsely confirming data that was not saved.

## Secure admin access

`/admin` is not public. The proxy guard redirects any visitor without a valid signed session to `/admin/login`. A simple forged cookie cannot unlock the dashboard. Sessions are HTTP-only, signed, expire after eight hours, and are cleared on logout. If either required admin environment value is missing, login is refused.

The production app also sends baseline security headers that prevent framing, block content-type sniffing, limit referrer detail, and disable unused browser permissions.

## Analytics and tracking

The first-party dashboard records anonymous visitor and visit IDs, page path, timestamp, source and action name. It tracks:

- ordinary public page views across the landing page, quiz, privacy page and confirmation page;
- anonymous traffic source from UTM parameters and referrer hostname (Facebook, Instagram, Google, WhatsApp and other common channels are labelled clearly), plus device class and viewport;

- landing view and quiz-start click;
- every question view and answer action;
- back buttons and the optional-question skip;
- contact form reach, validation failure, submit start, success, and failure;
- confirmation view, WhatsApp click, homepage return, and privacy-policy clicks from the landing page, quiz, and confirmation.

Answers and contact details are stored only with a submitted lead, not in the activity event log. The admin includes visitor/visit/lead metrics, a traffic trend, acquisition table, top pages, devices, funnel, source-attributed leads, recent activity and visitor progression.

No quiz answer, name, phone number or email address is sent to advertising platforms, UTM URLs or first-party activity metadata.

### Campaign links

The protected dashboard can create a unique `/go/<short-code>` link for every social post, ad creative, influencer, WhatsApp share, partner, flyer or QR code. A campaign-link click is recorded server-side before it redirects to the landing page or quiz with safe UTM values. The dashboard then reports link clicks, landing visits and submitted leads for that exact link.

Use a separate link for each placement or creative, for example one for a Facebook feed ad, another for an Instagram story, and another for a printed QR code. This first-party trail remains available even if a marketing pixel is blocked.

## Optional pixels

Set any of the public environment values in `.env.local.example` to enable the corresponding tool:

- Meta Pixel
- Google Tag Manager, GA4 and Google Ads
- TikTok Pixel
- LinkedIn Insight Tag
- Microsoft UET

The visitor sees a consent choice before any optional marketing pixel loads. Google Tag Manager can also carry any additional approved tags without changing the application code.

After a successfully saved lead, consented tools receive only a generic lead-conversion event. For Google Ads and LinkedIn lead conversions, also add `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` and `NEXT_PUBLIC_LINKEDIN_CONVERSION_ID` after creating the matching conversion actions in those platforms.

Use one Google setup, not two: either set `NEXT_PUBLIC_GTM_ID` and configure GA4/Google Ads inside Google Tag Manager, or leave GTM blank and set the direct GA4/Google Ads values. When GTM is present, the app deliberately suppresses direct Google tags to avoid duplicate page views and lead conversions.

## Email notifications

Set `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` to enable messages. Both the internal notification and the lead confirmation use a partnership header with the Kindred Path logo, `×`, and IFM LASUTH logo. Team members receive a branded HTML notification with WhatsApp/call actions, source, request type and follow-up context; leads who give an email receive a matching branded confirmation. If `LEAD_NOTIFICATION_EMAIL` is empty, team notifications go to the three addresses configured in `app/api/leads/route.ts`.

## Useful routes

- `/` — landing page
- `/quiz` — pre-qualification flow
- `/booking-confirmed` — confirmation and WhatsApp handoff
- `/admin` — password-protected activity dashboard
- `/go/<short-code>` — admin-created tracked campaign link
- `/privacy` — privacy policy
