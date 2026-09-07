import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { LeadRow } from "./LeadRow";

const stages = ["NEW", "CONTACTED", "QUALIFIED", "COURSE_SELECTED", "DOCUMENTS_PENDING", "APPLICATION_STARTED", "APPLICATION_SUBMITTED", "ADMISSION_CONFIRMED", "CLOSED", "NOT_INTERESTED"];

export default async function LeadsPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const searchParams = await searchParamsPromise;
  await requireStaff("admin.leads");
  const [leads, counsellors] = await Promise.all([
    dbAdmin.lead.findMany({
      where: { ...(searchParams.status ? { status: searchParams.status as never } : {}), ...(searchParams.q ? { OR: [{ name: { contains: searchParams.q, mode: "insensitive" } }, { mobile: { contains: searchParams.q } }, { leadCode: { contains: searchParams.q, mode: "insensitive" } }] } : {}) },
      orderBy: { createdAt: "desc" }, take: 200,
      include: { interestedUniversity: { select: { name: true } }, program: { select: { courseDisplay: true } }, counsellor: { select: { id: true, name: true } } },
    }),
    dbAdmin.staffUser.findMany({ where: { active: true, role: { in: ["COUNSELLOR", "SUPER_ADMIN"] } }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <h1>Leads</h1>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={searchParams.q} placeholder="Name, mobile or lead ID" className="field max-w-xs" />
        <select name="status" defaultValue={searchParams.status ?? ""} className="field max-w-xs"><option value="">All stages</option>{stages.map((s) => <option key={s} value={s}>{s.toLowerCase().replaceAll("_", " ")}</option>)}</select>
        <button className="btn-primary">Filter</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl2 border border-line">
        <table className="w-full min-w-[900px] text-sm">
          <thead><tr className="bg-mist text-left"><th className="p-3">Lead</th><th className="p-3">Contact</th><th className="p-3">Interest</th><th className="p-3">Source</th><th className="p-3">Stage</th><th className="p-3">Counsellor</th><th className="p-3">Follow-up</th></tr></thead>
          <tbody>{leads.map((l) => <LeadRow key={l.id} lead={{ id: l.id, leadCode: l.leadCode, name: l.name, mobile: l.mobile, whatsapp: l.whatsapp, email: l.email, city: l.city, qualification: l.qualification, interest: [l.interestedCourse, l.program?.courseDisplay, l.interestedUniversity?.name, l.mode, l.budget].filter(Boolean).join(" · "), source: [l.source, l.utmSource, l.utmCampaign].filter(Boolean).join(" / "), status: l.status, counsellorId: l.counsellor?.id ?? "", followUpDate: l.followUpDate?.toISOString().slice(0, 10) ?? "", notes: l.notes ?? "", createdAt: l.createdAt.toISOString().slice(0, 16).replace("T", " ") }} counsellors={counsellors} stages={stages} />)}</tbody>
        </table>
      </div>
      {leads.length === 0 && <p className="muted mt-4">No leads match.</p>}
    </div>
  );
}
