"use client";
import { useState, type FormEvent } from "react";
import { track } from "@/lib/analytics";
import { site } from "@/lib/config";

export type LeadContext = {
  source: string;
  interestedCourse?: string;
  universitySlug?: string;
  universityName?: string;
  programSlug?: string;
  specialization?: string;
  mode?: "Online" | "Distance" | "Either";
  budget?: string;
  objective?: string;
};

const qualifications = ["12th Pass", "Graduation", "Post Graduation", "Working Professional", "Diploma", "Other"];

function utm() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const saved = sessionStorage.getItem("dc.utm");
  const fromUrl = { source: p.get("utm_source") ?? undefined, medium: p.get("utm_medium") ?? undefined, campaign: p.get("utm_campaign") ?? undefined };
  if (fromUrl.source || fromUrl.medium || fromUrl.campaign) sessionStorage.setItem("dc.utm", JSON.stringify(fromUrl));
  return fromUrl.source ? fromUrl : saved ? JSON.parse(saved) : {};
}

export function LeadForm({ context, title = "Get personalised guidance", onDone, compact = false }: { context: LeadContext; title?: string; onDone?: (code: string) => void; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending"); setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"), mobile: fd.get("mobile"), whatsapp: fd.get("whatsapp") || fd.get("mobile"), email: fd.get("email"), city: fd.get("city"),
      qualification: fd.get("qualification"), website: fd.get("website"),
      ...context, utm: utm(), landingPath: window.location.pathname,
    };
    const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setState("error"); setError(json.error ?? "Something went wrong. Please try again or WhatsApp us."); return; }
    setCode(json.leadCode); setState("done");
    track("lead_submitted", { source: context.source, course: context.interestedCourse, university: context.universitySlug, lead_code: json.leadCode });
    onDone?.(json.leadCode);
  }

  if (state === "done") {
    return (
      <div className="rounded-xl2 border border-blue bg-blue-100 p-6" role="status">
        <p className="font-serif text-xl text-navy">Your enquiry has been received.</p>
        <p className="mt-2">Our education advisor will contact you shortly on your mobile number. Reference: <span className="font-semibold">{code}</span>.</p>
        <p className="muted mt-3">Prefer to talk now? Call {site.phoneDisplay}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p className="font-serif text-xl text-navy">{title}</p>
      {context.universityName && <p className="muted">For {context.interestedCourse ? `${context.interestedCourse} at ` : ""}{context.universityName}.</p>}
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div><label className="label" htmlFor="lf-name">Full name</label><input id="lf-name" name="name" required minLength={2} className="field" autoComplete="name" /></div>
        <div><label className="label" htmlFor="lf-mobile">Mobile number</label><input id="lf-mobile" name="mobile" required inputMode="numeric" pattern="(\+91)?[6-9][0-9]{9}" className="field" autoComplete="tel" placeholder="10-digit number" /></div>
        <div><label className="label" htmlFor="lf-wa">WhatsApp number <span className="text-gray-400">(if different)</span></label><input id="lf-wa" name="whatsapp" inputMode="numeric" className="field" /></div>
        <div><label className="label" htmlFor="lf-email">Email</label><input id="lf-email" name="email" type="email" className="field" autoComplete="email" /></div>
        <div><label className="label" htmlFor="lf-city">City</label><input id="lf-city" name="city" className="field" autoComplete="address-level2" /></div>
        <div>
          <label className="label" htmlFor="lf-qual">Highest qualification</label>
          <select id="lf-qual" name="qualification" className="field" defaultValue="">
            <option value="" disabled>Select</option>
            {qualifications.map((q) => <option key={q}>{q}</option>)}
          </select>
        </div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full sm:w-auto">{state === "sending" ? "Sending…" : "Get guidance"}</button>
      <p className="text-xs text-gray-500">By submitting you agree to be contacted by our advisors about your enquiry. No spam, no obligation.</p>
    </form>
  );
}

/** Button that opens the lead form in a native dialog. */
export function LeadCta({ context, label, className = "btn-blue", title }: { context: LeadContext; label: string; className?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => { setOpen(true); if (label.toLowerCase().includes("eligib")) track("eligibility_started", { course: context.interestedCourse, university: context.universitySlug }); }}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title ?? label} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl2 bg-white p-5 sm:max-w-lg sm:rounded-xl2">
            <div className="mb-2 flex justify-end"><button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-navy">Close</button></div>
            <LeadForm context={context} title={title ?? label} />
          </div>
        </div>
      )}
    </>
  );
}
