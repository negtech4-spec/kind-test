"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  configuredTrackingTools,
  parseTrackingSnippet,
  sanitizeTrackingSettings,
  type TrackingSettingKey,
  type TrackingSettings,
} from "@/lib/tracking-settings";

const fields: Array<{
  key: TrackingSettingKey;
  label: string;
  placeholder: string;
  helper: string;
}> = [
  { key: "metaPixelId", label: "Meta Pixel ID", placeholder: "123456789012345", helper: "Facebook and Instagram" },
  { key: "googleTagManagerId", label: "Google Tag Manager ID", placeholder: "GTM-ABC1234", helper: "Use GTM for other vendor HTML tags" },
  { key: "ga4MeasurementId", label: "GA4 Measurement ID", placeholder: "G-ABC123DEF", helper: "Leave blank when GA4 is inside GTM" },
  { key: "googleAdsId", label: "Google Ads tag ID", placeholder: "AW-123456789", helper: "Leave blank when Google Ads is inside GTM" },
  { key: "googleAdsConversionLabel", label: "Google Ads conversion label", placeholder: "AbCdeFGhijk", helper: "For the saved consultation-request conversion" },
  { key: "tiktokPixelId", label: "TikTok Pixel ID", placeholder: "C123ABC456DEF", helper: "TikTok Events Manager" },
  { key: "linkedInPartnerId", label: "LinkedIn Partner ID", placeholder: "123456", helper: "LinkedIn Insight Tag" },
  { key: "linkedInConversionId", label: "LinkedIn conversion ID", placeholder: "123456", helper: "Optional lead conversion" },
  { key: "microsoftUetTagId", label: "Microsoft UET tag ID", placeholder: "12345678", helper: "Microsoft Advertising" },
  { key: "clarityProjectId", label: "Microsoft Clarity project ID", placeholder: "abc123def", helper: "Session insights; requires consent" },
];

export default function TrackingSettingsManager({ initialSettings }: { initialSettings: TrackingSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState<TrackingSettings>(initialSettings);
  const [snippet, setSnippet] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  function update(key: TrackingSettingKey, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function importSnippet() {
    setError("");
    const parsed = parseTrackingSnippet(snippet);
    const count = Object.keys(parsed).length;
    if (!count) {
      setError("No supported tracking ID was found in that text. Paste an official vendor snippet or add the ID in its field below.");
      return;
    }
    setSettings((current) => ({ ...current, ...parsed }));
    setNotice(`${count} tracking ${count === 1 ? "setting" : "settings"} recognised. Review the fields, then save.`);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin/tracking-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" || !(result as { ok?: boolean }).ok) {
        const message = result && typeof result === "object" ? (result as { error?: unknown }).error : "";
        setError(typeof message === "string" ? message : "Tracking settings could not be saved.");
        return;
      }
      const saved = (result as { settings?: unknown }).settings;
      const next = sanitizeTrackingSettings(saved);
      setSettings(next);
      setNotice("Saved. New visitors who allow marketing cookies will use this configuration.");
      router.refresh();
    } catch {
      setError("Tracking settings could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const configured = configuredTrackingTools(sanitizeTrackingSettings(settings));

  return (
    <section className="mt-7 rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-plum-400">Advertising control</p>
          <h2 className="mt-1 font-serif text-xl font-medium text-plum-700">Pixels, tags and session insights</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/50">
            Add the public IDs for the tools you use. Visitors see none of these tools until they choose marketing cookies. Lead details and quiz answers are never sent to a pixel.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-plum-50 px-3 py-1.5 text-xs font-semibold text-plum-600">
          {configured} tools configured
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-plum-100 bg-[#fcfbfd] p-4 sm:p-5">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Paste an official vendor tag or ID</span>
          <span className="mt-1 block text-xs leading-relaxed text-ink/50">The importer recognises Meta, GTM, GA4, Google Ads, TikTok, LinkedIn, Microsoft UET and Clarity snippets.</span>
          <textarea
            value={snippet}
            onChange={(event) => setSnippet(event.target.value)}
            rows={4}
            placeholder="Paste the official code snippet here, or paste an ID below."
            className="focus-ring mt-3 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 font-mono text-xs text-ink placeholder:text-ink/30"
          />
        </label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-ink/45">For an unsupported vendor, use a consent-aware Custom HTML tag inside Google Tag Manager. Raw JavaScript is intentionally not run directly from this dashboard.</p>
          <button type="button" onClick={importSnippet} className="focus-ring shrink-0 rounded-xl border border-plum-100 bg-white px-3 py-2 text-sm font-semibold text-plum-600 hover:bg-plum-50">Read code</button>
        </div>
      </div>

      <form onSubmit={save} className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <label key={field.key} className="block rounded-xl border border-plum-50 bg-white p-3">
              <span className="text-xs font-semibold text-ink/70">{field.label}</span>
              <input
                value={settings[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
                autoComplete="off"
                spellCheck={false}
                className="focus-ring mt-2 w-full rounded-lg border border-plum-100 bg-[#fcfbfd] px-3 py-2 text-sm text-ink placeholder:text-ink/30"
              />
              <span className="mt-1.5 block text-[11px] leading-relaxed text-ink/40">{field.helper}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-plum-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-ink/50">Saving an empty field turns that direct tag off. If GTM is filled in, it takes ownership of GA4 and Google Ads to avoid double counting.</p>
          <button type="submit" disabled={saving} className="focus-ring shrink-0 rounded-xl bg-plum-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-plum-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save tracking setup"}</button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
      </form>
    </section>
  );
}
