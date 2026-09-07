"use client";
import { callLink, whatsappLink, site } from "@/lib/config";
import { track } from "@/lib/analytics";

export function StickyCta({ context }: { context?: string }) {
  const msg = context ? `Hi, I'd like guidance on ${context}.` : "Hi, I'd like guidance on online/distance degree programs.";
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden" role="region" aria-label="Contact an education expert">
      <div className="flex gap-2">
        <a href={whatsappLink(msg)} target="_blank" rel="noopener" onClick={() => track("whatsapp_click", { path: location.pathname })} className="btn-primary flex-1 text-sm">WhatsApp an expert</a>
        <a href={callLink} onClick={() => track("call_click", { path: location.pathname })} className="btn-outline flex-1 text-sm">Call {site.phoneDisplay}</a>
      </div>
    </div>
  );
}

export function ContactButtons({ context, className = "" }: { context?: string; className?: string }) {
  const msg = context ? `Hi, I'd like guidance on ${context}.` : undefined;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a href={whatsappLink(msg)} target="_blank" rel="noopener" onClick={() => track("whatsapp_click", { path: location.pathname })} className="btn-primary">WhatsApp an education expert</a>
      <a href={callLink} onClick={() => track("call_click", { path: location.pathname })} className="btn-outline">Call for guidance</a>
    </div>
  );
}
