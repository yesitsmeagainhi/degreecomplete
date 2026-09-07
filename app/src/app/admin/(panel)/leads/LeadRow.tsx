"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type L = { id: string; leadCode: string; name: string; mobile: string; whatsapp: string | null; email: string | null; city: string | null; qualification: string | null; interest: string; source: string; status: string; counsellorId: string; followUpDate: string; notes: string; createdAt: string };

export function LeadRow({ lead, counsellors, stages }: { lead: L; counsellors: { id: string; name: string }[]; stages: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/admin/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setSaving(false); router.refresh();
  }
  return (
    <>
      <tr className="border-t border-line align-top">
        <td className="p-3"><span className="font-medium text-navy">{lead.name}</span><br /><span className="text-xs text-gray-500">{lead.leadCode} · {lead.createdAt}</span></td>
        <td className="p-3">{lead.mobile}{lead.whatsapp && lead.whatsapp !== lead.mobile ? <><br />WA {lead.whatsapp}</> : null}{lead.email && <><br />{lead.email}</>}{lead.city && <><br />{lead.city}</>}{lead.qualification && <><br /><span className="text-xs text-gray-500">{lead.qualification}</span></>}</td>
        <td className="p-3">{lead.interest || "—"}</td>
        <td className="p-3 text-xs text-gray-600">{lead.source}</td>
        <td className="p-3"><select value={lead.status} disabled={saving} onChange={(e) => save({ status: e.target.value })} className="field !min-h-9 !py-1 text-xs">{stages.map((s) => <option key={s} value={s}>{s.toLowerCase().replaceAll("_", " ")}</option>)}</select></td>
        <td className="p-3"><select value={lead.counsellorId} disabled={saving} onChange={(e) => save({ counsellorId: e.target.value || null })} className="field !min-h-9 !py-1 text-xs"><option value="">Unassigned</option>{counsellors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
        <td className="p-3"><input type="date" defaultValue={lead.followUpDate} onBlur={(e) => e.target.value !== lead.followUpDate && save({ followUpDate: e.target.value || null })} className="field !min-h-9 !py-1 text-xs" /><button type="button" onClick={() => setOpen(!open)} className="mt-1 text-xs underline">{open ? "Hide notes" : "Notes"}</button></td>
      </tr>
      {open && <tr className="border-t border-line bg-mist"><td colSpan={7} className="p-3"><textarea defaultValue={lead.notes} rows={3} className="field text-sm" placeholder="Call notes, next action…" onBlur={(e) => e.target.value !== lead.notes && save({ notes: e.target.value })} /></td></tr>}
    </>
  );
}
