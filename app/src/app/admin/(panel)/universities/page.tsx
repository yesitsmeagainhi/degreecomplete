import { revalidatePath } from "next/cache";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export default async function UniversitiesAdmin() {
  await requireStaff("admin.universities");
  const list = await dbAdmin.university.findMany({
    orderBy: { name: "asc" },
    include: { programs: { select: { id: true, courseDisplay: true, mode: true, status: true, eligibilityText: true, durationYears: true, _count: { select: { fees: { where: { status: "PUBLISHED" } } } } }, orderBy: { course: "asc" } } },
  });

  async function saveUniversity(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.universities");
    const id = String(fd.get("id"));
    const data = { description: String(fd.get("description") ?? "").slice(0, 2000) || null, shortName: String(fd.get("shortName") ?? "").slice(0, 60) || null, status: String(fd.get("status")) as never, verificationStatus: String(fd.get("verificationStatus")) as never };
    const before = await dbAdmin.university.findUnique({ where: { id }, select: { status: true, verificationStatus: true } });
    await dbAdmin.university.update({ where: { id }, data: { ...data, publishedAt: data.verificationStatus === "PUBLISHED" ? new Date() : undefined } });
    await audit(s, "university.update", "University", id, before, data);
    revalidatePath("/admin/universities");
  }
  async function saveProgram(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.programs");
    const id = String(fd.get("id"));
    const data = { eligibilityText: String(fd.get("eligibilityText") ?? "").slice(0, 1500) || null, durationYears: fd.get("durationYears") ? Number(fd.get("durationYears")) : null, status: String(fd.get("status")) as never };
    await dbAdmin.program.update({ where: { id }, data: { ...data, publishedAt: data.status === "PUBLISHED" ? new Date() : undefined } });
    await audit(s, "program.update", "Program", id, undefined, data);
    revalidatePath("/admin/universities");
  }

  const uStatus = ["ACTIVE", "ON_HOLD", "NOT_AVAILABLE", "NO_FEE_DATA", "NO_DATA"];
  const vStatus = ["UNDER_REVIEW", "VERIFIED", "PUBLISHED", "EXPIRED"];
  return (
    <div>
      <h1>Universities and programs</h1>
      <p className="muted mt-1">A university appears publicly only when status is Active and publication is Published. A program appears only when Published — a published program with no published fee shows “Contact us to confirm current fee”. Eligibility is blank until you enter verified criteria.</p>
      <div className="mt-4 space-y-4">
        {list.map((u) => (
          <details key={u.id} className="card">
            <summary className="cursor-pointer"><span className="font-medium text-navy">{u.name}</span> <span className="muted">— {u.status.toLowerCase().replaceAll("_", " ")} · {u.verificationStatus.toLowerCase().replaceAll("_", " ")} · {u.programs.length} programs</span></summary>
            <form action={saveUniversity} className="mt-4 grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="id" value={u.id} />
              <div><label className="label text-xs">Short name</label><input name="shortName" defaultValue={u.shortName ?? ""} className="field !min-h-9 !py-1 text-sm" /></div>
              <div><label className="label text-xs">Partner status</label><select name="status" defaultValue={u.status} className="field !min-h-9 !py-1 text-sm">{uStatus.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div><label className="label text-xs">Publication</label><select name="verificationStatus" defaultValue={u.verificationStatus} className="field !min-h-9 !py-1 text-sm">{vStatus.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div className="flex items-end"><button className="btn-primary !min-h-9 !py-1 text-sm">Save</button></div>
              <div className="sm:col-span-4"><label className="label text-xs">Public description</label><textarea name="description" rows={2} defaultValue={u.description ?? ""} className="field text-sm" /></div>
            </form>
            <ul className="mt-4 divide-y divide-line">
              {u.programs.map((p) => (
                <li key={p.id} className="py-3">
                  <form action={saveProgram} className="grid gap-2 sm:grid-cols-6">
                    <input type="hidden" name="id" value={p.id} />
                    <p className="text-sm sm:col-span-2"><span className="font-medium text-navy">{p.courseDisplay}</span> <span className="muted">({p.mode.toLowerCase()}) · {p._count.fees} published fee{p._count.fees === 1 ? "" : "s"}</span></p>
                    <select name="status" defaultValue={p.status} className="field !min-h-9 !py-1 text-xs">{vStatus.map((x) => <option key={x}>{x}</option>)}</select>
                    <input name="durationYears" defaultValue={p.durationYears ?? ""} placeholder="Years" inputMode="decimal" className="field !min-h-9 !py-1 text-xs" />
                    <input name="eligibilityText" defaultValue={p.eligibilityText ?? ""} placeholder="Verified eligibility text" className="field !min-h-9 !py-1 text-xs" />
                    <button className="btn-outline !min-h-9 !py-1 text-xs">Save</button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
