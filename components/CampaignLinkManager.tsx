"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { CampaignLink } from "@/lib/store";

export type CampaignLinkDashboardRow = CampaignLink & {
  url: string;
  clicks: number;
  landingVisits: number;
  leads: number;
};

type LinkForm = {
  label: string;
  source: string;
  medium: string;
  campaign: string;
  destination: "/" | "/quiz";
  code: string;
};

const initialForm: LinkForm = {
  label: "",
  source: "facebook",
  medium: "paid_social",
  campaign: "",
  destination: "/",
  code: "",
};

const channels = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["whatsapp", "WhatsApp"],
  ["google", "Google"],
  ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"],
  ["qr", "QR code / flyer"],
  ["partner", "Partner / referral"],
  ["other", "Other"],
] as const;

const media = [
  ["paid_social", "Paid social ad"],
  ["organic_social", "Organic social post"],
  ["paid_search", "Paid search ad"],
  ["message", "WhatsApp / direct message"],
  ["qr", "QR code / flyer"],
  ["referral", "Partner referral"],
  ["other", "Other"],
] as const;

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CampaignLinkManager({
  rows,
  baseUrl,
}: {
  rows: CampaignLinkDashboardRow[];
  baseUrl: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<LinkForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [copied, setCopied] = useState("");

  function update<Key extends keyof LinkForm>(key: Key, value: LinkForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      window.prompt("Copy this tracked link", url);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreatedUrl("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin/campaign-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result?.ok || !result?.link?.slug) {
        setError(result?.error || "We could not create the campaign link.");
        return;
      }

      const nextUrl = `${baseUrl}/go/${result.link.slug}`;
      setCreatedUrl(nextUrl);
      setForm((current) => ({ ...current, label: "", code: "" }));
      router.refresh();
    } catch {
      setError("We could not create the campaign link. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-7 rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-plum-400">Campaign control</p>
          <h2 className="mt-1 font-serif text-xl font-medium text-plum-700">Tracked social and ad links</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/50">
            Create one link for every Facebook post, Instagram story, WhatsApp share, ad creative,
            flyer, QR code or partner. It records the click before redirecting, then connects the
            visit, quiz journey and lead to that exact campaign.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-plum-50 px-3 py-1.5 text-xs font-semibold text-plum-600">
          First-party tracking
        </span>
      </div>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-plum-100 bg-[#fcfbfd] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Link name</span>
            <input
              required
              value={form.label}
              onChange={(event) => update("label", event.target.value)}
              placeholder="Facebook September ad – version A"
              className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/30"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Channel</span>
            <select
              value={form.source}
              onChange={(event) => update("source", event.target.value)}
              className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink"
            >
              {channels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Type</span>
            <select
              value={form.medium}
              onChange={(event) => update("medium", event.target.value)}
              className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink"
            >
              {media.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Campaign name</span>
            <input
              required
              value={form.campaign}
              onChange={(event) => update("campaign", event.target.value)}
              placeholder="kp-september-clarity-2026"
              className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/30"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Where should it open?</span>
            <select
              value={form.destination}
              onChange={(event) => update("destination", event.target.value as LinkForm["destination"])}
              className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink"
            >
              <option value="/">Clarity Check landing page</option>
              <option value="/quiz">Start the quiz directly</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Custom short code <span className="font-normal text-ink/35">(optional)</span></span>
            <input
              value={form.code}
              onChange={(event) => update("code", event.target.value)}
              placeholder="fb-sept-a"
              className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/30"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-plum-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-ink/45">A unique code is created automatically if you leave the last field empty.</p>
          <button
            type="submit"
            disabled={saving}
            className="focus-ring rounded-xl bg-plum-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-plum-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creating link…" : "Create tracked link"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        {createdUrl && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800">Your tracked link is ready</p>
              <p className="mt-0.5 break-all font-mono text-xs text-emerald-700">{createdUrl}</p>
            </div>
            <button type="button" onClick={() => copyLink(createdUrl)} className="focus-ring shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm">
              {copied === createdUrl ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </form>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-medium text-plum-700">Link performance</h3>
            <p className="mt-1 text-xs text-ink/45">Click → landing visit → submitted lead for the selected date range.</p>
          </div>
          <span className="text-xs font-semibold text-plum-500">{rows.length} links</span>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-xl bg-plum-50 px-4 py-3 text-sm text-plum-600">Create your first campaign link above before posting or launching an ad.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] text-left text-sm">
              <thead>
                <tr className="border-b border-plum-50 text-[11px] uppercase tracking-wide text-ink/40">
                  <th className="pb-2 pr-4 font-medium">Link</th>
                  <th className="pb-2 pr-4 font-medium">Campaign</th>
                  <th className="pb-2 pr-4 font-medium">Clicks</th>
                  <th className="pb-2 pr-4 font-medium">Landings</th>
                  <th className="pb-2 pr-4 font-medium">Leads</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-plum-50/70">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-ink">{row.label}</p>
                      <p className="mt-0.5 text-xs text-ink/45">/{"go/"}{row.slug} · {formatDate(row.createdAt)}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink/60"><span className="font-semibold text-ink">{row.source}</span> · {row.campaign}</td>
                    <td className="py-3 pr-4 font-semibold text-plum-600">{row.clicks}</td>
                    <td className="py-3 pr-4 text-ink/70">{row.landingVisits}</td>
                    <td className="py-3 pr-4 font-semibold text-emerald-700">{row.leads}</td>
                    <td className="py-3">
                      <button type="button" onClick={() => copyLink(row.url)} className="focus-ring rounded-lg border border-plum-100 px-3 py-1.5 text-xs font-semibold text-plum-600 hover:bg-plum-50">
                        {copied === row.url ? "Copied" : "Copy link"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
