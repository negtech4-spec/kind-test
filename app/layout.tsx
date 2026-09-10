import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import CookieConsent from "@/components/CookieConsent";
import FacebookPixel from "@/components/FacebookPixel";
import MarketingPixels from "@/components/MarketingPixels";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kindred Path | Free 1st Anniversary Consultation",
  description:
    "Take the 30-second pre-qualification quiz for a free private consultation with Kindred Path, in partnership with LASUTH, Ikeja.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <AnalyticsTracker />
        <FacebookPixel />
        <MarketingPixels />

        {children}

        <CookieConsent />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
