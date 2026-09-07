import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";

/** FINANCE and SUPER_ADMIN only. Reads schema `internal` via the admin connection. */
export default async function CommercialsPage() {
  const staff = await requireStaff("admin.commercials");
  const [payouts, sharing, subvention, notes, workflow] = await Promise.all([
    dbAdmin.partnerCommercial.findMany({ include: { university: { select: { name: true, status: true } } }, orderBy: { university: { name: "asc" } } }),
    dbAdmin.centerSharing.findMany({ orderBy: [{ mode: "asc" }, { course: "asc" }] }),
    dbAdmin.subventionNote.findMany({ orderBy: { row: "asc" } }),
    dbAdmin.internalNote.findMany({ orderBy: { createdAt: "asc" } }),
    dbAdmin.partnerInvoice.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  await audit(staff, "commercials.view", "PartnerCommercial", "all");
  return (
    <div className="space-y-8">
      <div><h1>Partner commercials</h1><p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">Confidential. Viewing this page is audit-logged. Nothing here is ever sent to the public site, APIs or analytics.</p></div>
      <section>
        <h2>Payout shares (July-2026 annexure)</h2>
        <div className="mt-3 overflow-x-auto rounded-xl2 border border-line"><table className="w-full min-w-[800px] text-sm"><thead><tr className="bg-mist text-left"><th className="p-3">University</th><th className="p-3">Channel</th><th className="p-3">Scope</th><th className="p-3">Payout</th><th className="p-3">If loan</th><th className="p-3">Working</th><th className="p-3">Source</th></tr></thead>
          <tbody>{payouts.map((p) => <tr key={p.id} className="border-t border-line"><td className="p-3">{p.university.name}<br /><span className="text-xs text-gray-500">code {p.partnerShortCode}</span></td><td className="p-3">{p.channel}</td><td className="p-3">{p.programScope}</td><td className="p-3 font-medium text-navy">{p.payoutShare}</td><td className="p-3">{p.payoutShareIfLoan}</td><td className="p-3">{p.workingStatus}</td><td className="p-3 text-xs text-gray-500">{p.sourceFile} · {p.sourceRef}</td></tr>)}</tbody></table></div>
      </section>
      <section>
        <h2>Center sharing — Mangalayatan (student pay vs center pay, per year)</h2>
        <p className="muted mt-1">{sharing[0]?.semantics}</p>
        <div className="mt-3 overflow-x-auto rounded-xl2 border border-line"><table className="w-full min-w-[700px] text-sm"><thead><tr className="bg-mist text-left"><th className="p-3">Mode</th><th className="p-3">Course</th><th className="p-3">Specialization</th><th className="p-3">Student pay</th><th className="p-3">Center pay</th></tr></thead>
          <tbody>{sharing.map((c) => <tr key={c.id} className="border-t border-line"><td className="p-3">{c.mode}</td><td className="p-3">{c.course}</td><td className="p-3">{c.specialization ?? "—"}</td><td className="p-3">{(c.studentPayYears as number[]).join(" / ")}</td><td className="p-3">{(c.centerPayYears as (number | null)[]).filter(Boolean).join(" / ")}</td></tr>)}</tbody></table></div>
      </section>
      <section><h2>Subvention / loan cost notes</h2><ul className="mt-3 space-y-1 text-sm">{subvention.map((s) => <li key={s.id} className="rounded bg-mist px-3 py-1">{(s.cells as string[]).join(" | ")}</li>)}</ul></section>
      <section><h2>Partner invoice cycle</h2><p className="muted mt-1">Per annexure: provisional invoice within 7 days of receipt upload; status "Ready to Generate" on the 6th of the following month; centre updates invoice number in ERP; credited by the 15th; late invoices roll to the next cycle. Re-registration invoices monthly, paid within 15 days of processing.</p><p className="mt-2 text-sm">Invoices tracked: {workflow.length ? workflow.map((w) => `${w.status.toLowerCase()} ${w._count._all}`).join(", ") : "none recorded yet"}.</p></section>
      <section><h2>Internal notes</h2><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">{notes.map((n) => <li key={n.id}>{n.body}</li>)}</ul></section>
    </div>
  );
}
