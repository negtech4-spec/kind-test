"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/store";

const statusOptions: Array<{ value: LeadStatus; label: string; tone: string }> = [
  { value: "new", label: "New", tone: "bg-plum-50 text-plum-700" },
  { value: "contacted", label: "Contacted", tone: "bg-sky-50 text-sky-700" },
  { value: "consultation_scheduled", label: "Scheduled", tone: "bg-amber-50 text-amber-700" },
  { value: "consultation_booked", label: "Booked", tone: "bg-emerald-50 text-emerald-700" },
  { value: "nurture", label: "Nurture", tone: "bg-[#fff1f7] text-berry" },
  { value: "closed", label: "Closed", tone: "bg-slate-100 text-slate-600" },
];

const answers: Record<"q1" | "q2" | "q3" | "q4", Record<string, string>> = {
  q1: {
    grow: "Start or grow a family",
    checkup: "General reproductive health checkup",
    info: "General information",
  },
  q2: { "<1": "Less than 1 year", "1-3": "1 to 3 years", ">3": "Over 3 years" },
  q3: { yes: "Can visit Ikeja", no: "Cannot visit physically" },
  q4: {
    morning: "Morning (8am–12pm)",
    afternoon: "Afternoon (12pm–4pm)",
    evening: "Evening (4pm–8pm)",
    anytime: "Anytime",
  },
};

function formatDate(timestamp: number | null) {
  if (!timestamp) return "Not set";
  return new Date(timestamp).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function statusMeta(status: LeadStatus) {
  return statusOptions.find((option) => option.value === status) ?? statusOptions[0];
}

function localDateTime(timestamp: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  return normalized ? `https://wa.me/${normalized}` : "#";
}

function answerText(question: "q1" | "q2" | "q3" | "q4", value: string | null) {
  if (!value) return question === "q4" ? "Not selected" : "Not recorded";
  return answers[question][value] ?? value;
}

type LeadDraft = Pick<Lead, "status" | "adminNote" | "followUpAt">;

export default function LeadManager({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialLeads[0]?.id ?? null);
  const [draft, setDraft] = useState<LeadDraft>(() => ({
    status: initialLeads[0]?.status ?? "new",
    adminNote: initialLeads[0]?.adminNote ?? null,
    followUpAt: initialLeads[0]?.followUpAt ?? null,
  }));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLeads(initialLeads);
    setSelectedId((current) => initialLeads.some((lead) => lead.id === current) ? current : initialLeads[0]?.id ?? null);
  }, [initialLeads]);

  const selected = leads.find((lead) => lead.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setDraft({
      status: selected.status,
      adminNote: selected.adminNote,
      followUpAt: selected.followUpAt,
    });
    setNotice("");
    setError("");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleLeads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...leads]
      .filter((lead) => filter === "all" || lead.status === filter)
      .filter((lead) => {
        if (!needle) return true;
        return [
          lead.fullName,
          lead.phone,
          lead.email,
          lead.source,
          lead.referrer,
          lead.utmCampaign,
          lead.utmContent,
        ].some((value) => value?.toLowerCase().includes(needle));
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [filter, leads, query]);

  const counts = useMemo(() => {
    const values = Object.fromEntries(statusOptions.map((option) => [option.value, 0])) as Record<LeadStatus, number>;
    leads.forEach((lead) => { values[lead.status] += 1; });
    return values;
  }, [leads]);

  function selectLead(lead: Lead) {
    setSelectedId(lead.id);
  }

  async function saveLead() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: draft.status,
          adminNote: draft.adminNote ?? "",
          followUpAt: draft.followUpAt,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" || !(result as { ok?: boolean }).ok) {
        const message = result && typeof result === "object" ? (result as { error?: unknown }).error : null;
        setError(typeof message === "string" ? message : "The lead could not be updated.");
        return;
      }
      const updated = (result as { lead?: Lead }).lead;
      if (!updated) {
        setError("The lead was updated but its latest details could not be read.");
        return;
      }
      setLeads((current) => current.map((lead) => lead.id === updated.id ? updated : lead));
      setNotice("Follow-up details saved.");
    } catch {
      setError("The lead could not be updated. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-7 rounded-2xl border border-plum-50 bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-plum-400">Lead operations</p>
          <h2 className="mt-1 font-serif text-xl font-medium text-plum-700">Every submitted consultation request</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/50">Open a lead to see the protected contact details, answers, complete source attribution, and internal follow-up history.</p>
        </div>
        <a href="/api/admin/leads/export" className="focus-ring inline-flex shrink-0 items-center justify-center rounded-xl border border-plum-100 bg-white px-4 py-2.5 text-sm font-semibold text-plum-600 hover:bg-plum-50">Download secure CSV</a>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter((current) => current === option.value ? "all" : option.value)}
            className={`focus-ring rounded-xl border px-3 py-2.5 text-left transition-colors ${filter === option.value ? "border-plum-300 bg-plum-50" : "border-plum-50 bg-[#fcfbfd] hover:bg-plum-50/60"}`}
          >
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/45">{option.label}</span>
            <span className="mt-0.5 block font-serif text-2xl text-plum-700">{counts[option.value]}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block w-full sm:max-w-md">
          <span className="sr-only">Search leads</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, email, source or campaign" className="focus-ring w-full rounded-xl border border-plum-100 bg-[#fcfbfd] px-3 py-2.5 text-sm text-ink placeholder:text-ink/30" />
        </label>
        <div className="flex items-center gap-3 text-xs text-ink/50"><span>{visibleLeads.length} showing</span>{filter !== "all" && <button type="button" onClick={() => setFilter("all")} className="focus-ring font-semibold text-plum-600">Clear filter</button>}</div>
      </div>

      {leads.length === 0 ? (
        <div className="mt-5 rounded-xl bg-plum-50 px-4 py-5 text-sm leading-relaxed text-plum-600">No submitted leads yet. Once a visitor completes the contact form successfully, their contact details, answers and source will appear here.</div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="overflow-hidden rounded-2xl border border-plum-50">
            <div className="max-h-[42rem] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white"><tr className="border-b border-plum-50 text-[11px] uppercase tracking-wide text-ink/40"><th className="px-4 py-3 font-medium">Lead</th><th className="px-3 py-3 font-medium">Source</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Follow-up</th><th className="px-4 py-3 text-right font-medium">Open</th></tr></thead>
                <tbody>
                  {visibleLeads.map((lead) => {
                    const meta = statusMeta(lead.status);
                    return <tr key={lead.id} className={`border-b border-plum-50/70 transition-colors ${selectedId === lead.id ? "bg-plum-50/70" : "hover:bg-[#fcfbfd]"}`}>
                      <td className="px-4 py-3"><p className="font-semibold text-ink">{lead.fullName}</p><p className="mt-0.5 text-xs text-ink/50">{lead.phone} · {formatDate(lead.timestamp)}</p></td>
                      <td className="px-3 py-3"><p className="text-xs font-semibold text-ink/75">{lead.source || lead.referrer || "Direct"}</p><p className="mt-0.5 max-w-[180px] truncate text-[11px] text-ink/45">{lead.utmCampaign || lead.utmContent || "No campaign"}</p></td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.tone}`}>{meta.label}</span></td>
                      <td className="px-3 py-3 text-xs text-ink/55">{lead.followUpAt ? formatDate(lead.followUpAt) : "Not scheduled"}</td>
                      <td className="px-4 py-3 text-right"><button type="button" onClick={() => selectLead(lead)} className="focus-ring rounded-lg border border-plum-100 px-3 py-1.5 text-xs font-semibold text-plum-600 hover:bg-white">View</button></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            {visibleLeads.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink/50">No leads match this search.</p>}
          </div>

          <aside className="rounded-2xl border border-plum-50 bg-[#fcfbfd] p-4 sm:p-5 xl:sticky xl:top-5 xl:self-start">
            {!selected ? <p className="text-sm text-ink/50">Select a lead to see their details.</p> : <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-plum-100 pb-4">
                <div><h3 className="font-serif text-xl font-medium text-plum-700">{selected.fullName}</h3><p className="mt-1 text-xs text-ink/50">Submitted {formatDate(selected.timestamp)}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta(selected.status).tone}`}>{statusMeta(selected.status).label}</span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <a href={whatsappUrl(selected.phone)} target="_blank" rel="noreferrer" className="focus-ring rounded-xl bg-[#25D366] px-3 py-2.5 text-center text-sm font-semibold text-white hover:brightness-95">Message on WhatsApp</a>
                {selected.email && <a href={`mailto:${selected.email}`} className="focus-ring rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-center text-sm font-semibold text-plum-600 hover:bg-plum-50">Send email</a>}
              </div>

              <div className="mt-5 rounded-xl border border-plum-100 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-plum-400">Contact details</p>
                <p className="mt-2 text-sm font-semibold text-ink">{selected.phone}</p>
                <p className="mt-1 break-all text-sm text-ink/65">{selected.email || "No email provided"}</p>
                <p className="mt-2 text-xs text-ink/50">{selected.consultationType === "remote" ? "Remote follow-up requested" : "In-person visit selected"}</p>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-plum-400">Quiz answers</p>
                <dl className="mt-2 space-y-2 text-sm"><div><dt className="text-xs text-ink/45">Focus</dt><dd className="font-medium text-ink">{answerText("q1", selected.q1)}</dd></div><div><dt className="text-xs text-ink/45">Journey length</dt><dd className="font-medium text-ink">{answerText("q2", selected.q2)}</dd></div><div><dt className="text-xs text-ink/45">Can visit Ikeja</dt><dd className="font-medium text-ink">{answerText("q3", selected.q3)}</dd></div><div><dt className="text-xs text-ink/45">Best WhatsApp time</dt><dd className="font-medium text-ink">{answerText("q4", selected.q4)}</dd></div></dl>
              </div>

              <div className="mt-5 rounded-xl border border-plum-100 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-plum-400">Attribution</p>
                <dl className="mt-2 grid gap-2 text-xs"><div><dt className="text-ink/45">Source</dt><dd className="font-medium text-ink">{selected.source || "Direct"}</dd></div><div><dt className="text-ink/45">Campaign</dt><dd className="break-words font-medium text-ink">{selected.utmCampaign || "Not recorded"}</dd></div><div><dt className="text-ink/45">Medium / content</dt><dd className="break-words font-medium text-ink">{[selected.utmMedium, selected.utmContent].filter(Boolean).join(" · ") || "Not recorded"}</dd></div><div><dt className="text-ink/45">Referrer / landing page</dt><dd className="break-words font-medium text-ink">{[selected.referrer, selected.landingPath].filter(Boolean).join(" · ") || "Not recorded"}</dd></div></dl>
              </div>

              <div className="mt-5 border-t border-plum-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-plum-400">Follow-up workspace</p>
                <label className="mt-3 block"><span className="text-xs font-semibold text-ink/65">Status</span><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as LeadStatus }))} className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="mt-3 block"><span className="text-xs font-semibold text-ink/65">Follow-up due <span className="font-normal text-ink/40">(optional)</span></span><input type="datetime-local" value={localDateTime(draft.followUpAt)} onChange={(event) => setDraft((current) => ({ ...current, followUpAt: event.target.value ? new Date(event.target.value).getTime() : null }))} className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink" /></label>
                <label className="mt-3 block"><span className="text-xs font-semibold text-ink/65">Private note</span><textarea value={draft.adminNote ?? ""} onChange={(event) => setDraft((current) => ({ ...current, adminNote: event.target.value || null }))} rows={4} placeholder="Internal follow-up notes only" className="focus-ring mt-1.5 w-full rounded-xl border border-plum-100 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/30" /></label>
                <button type="button" onClick={saveLead} disabled={saving} className="focus-ring mt-4 w-full rounded-xl bg-plum-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save follow-up"}</button>
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
                {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
              </div>
            </>}
          </aside>
        </div>
      )}
    </section>
  );
}
