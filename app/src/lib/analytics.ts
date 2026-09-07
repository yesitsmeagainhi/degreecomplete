"use client";
/**
 * Single funnel for analytics. Pushes to GTM dataLayer (which fans out to GA4) and Meta Pixel.
 * Payloads carry ONLY public catalogue identifiers — never fee-internal or commercial fields.
 */
export type AnalyticsEvent =
  | "university_viewed" | "course_viewed" | "fee_viewed" | "compare_started" | "compare_completed"
  | "eligibility_started" | "lead_submitted" | "whatsapp_click" | "call_click" | "application_started" | "application_completed";

type Payload = Record<string, string | number | boolean | undefined>;
declare global { interface Window { dataLayer?: unknown[]; fbq?: (...a: unknown[]) => void } }

const ALLOWED_KEYS = new Set(["university", "course", "mode", "level", "specialization", "source", "count", "path", "lead_code", "application_code"]);

export function track(event: AnalyticsEvent, payload: Payload = {}) {
  if (typeof window === "undefined") return;
  const safe: Payload = {};
  for (const [k, v] of Object.entries(payload)) if (ALLOWED_KEYS.has(k) && v !== undefined) safe[k] = v;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...safe });
  if (window.fbq) {
    if (event === "lead_submitted") window.fbq("track", "Lead", safe);
    else if (event === "application_completed") window.fbq("track", "SubmitApplication", safe);
    else window.fbq("trackCustom", event, safe);
  }
}
