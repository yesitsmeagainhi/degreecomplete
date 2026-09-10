import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/format";

const levels = ["UG", "PG", "Diploma", "PG Diploma", "Certificate", "PG Certificate", "Doctoral", "Executive", "Integrated", "Other"];

export default async function UniversitiesAdmin({ searchParams: searchParamsPromise }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const searchParams = await searchParamsPromise;
  await requireStaff("admin.universities");
  const list = await dbAdmin.university.findMany({
    orderBy: { name: "asc" },
    include: { programs: { select: { id: true, courseDisplay: true, mode: true, status: true, eligibilityText: true, durationYears: true, _count: { select: { fees: { where: { status: "PUBLISHED" } } } } }, orderBy: { course: "asc" } } },
  });

  // ---- Update existing ----

  async function saveUniversity(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.universities");
    const id = String(fd.get("id"));
    const data = { description: String(fd.get("description") ?? "").slice(0, 2000) || null, shortName: String(fd.get("shortName") ?? "").slice(0, 60) || null, status: String(fd.get("status")) as never, verificationStatus: String(fd.get("verificationStatus")) as never };
    try {
      const before = await dbAdmin.university.findUnique({ where: { id }, select: { status: true, verificationStatus: true } });
      await dbAdmin.university.update({ where: { id }, data: { ...data, publishedAt: data.verificationStatus === "PUBLISHED" ? new Date() : undefined } });
      await audit(s, "university.update", "University", id, before, data);
    } catch (e) {
      redirect(`/admin/universities?err=${encodeURIComponent(String(e instanceof Error ? e.message : e))}`);
    }
    revalidatePath("/admin/universities");
    redirect("/admin/universities?msg=University+saved");
  }
  async function saveProgram(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.programs");
    const id = String(fd.get("id"));
    const data = { eligibilityText: String(fd.get("eligibilityText") ?? "").slice(0, 1500) || null, durationYears: fd.get("durationYears") ? Number(fd.get("durationYears")) : null, status: String(fd.get("status")) as never };
    try {
      await dbAdmin.program.update({ where: { id }, data: { ...data, publishedAt: data.status === "PUBLISHED" ? new Date() : undefined } });
      await audit(s, "program.update", "Program", id, undefined, data);
    } catch (e) {
      redirect(`/admin/universities?err=${encodeURIComponent(String(e instanceof Error ? e.message : e))}`);
    }
    revalidatePath("/admin/universities");
    redirect("/admin/universities?msg=Program+saved");
  }

  // ---- Create new ----

  async function createUniversity(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.universities");
    const name = String(fd.get("name") ?? "").trim().slice(0, 200);
    if (!name) redirect(`/admin/universities?err=${encodeURIComponent("University name is required")}`);
    const slug = slugify(name);
    if (!slug) redirect(`/admin/universities?err=${encodeURIComponent("Name produces an invalid slug — use Latin letters and numbers")}`);
    const data = {
      slug,
      name,
      shortName: String(fd.get("shortName") ?? "").slice(0, 60) || null,
      location: String(fd.get("location") ?? "").slice(0, 120) || null,
      website: String(fd.get("website") ?? "").slice(0, 200) || null,
      description: String(fd.get("description") ?? "").slice(0, 2000) || null,
      status: "NO_DATA" as const,
      verificationStatus: "UNDER_REVIEW" as const,
    };
    try {
      const u = await dbAdmin.university.create({ data });
      await audit(s, "university.create", "University", u.id, null, data);
    } catch (e) {
      const msg = e instanceof Error && e.message.includes("Unique constraint")
        ? `A university with slug "${slug}" already exists`
        : String(e instanceof Error ? e.message : e);
      redirect(`/admin/universities?err=${encodeURIComponent(msg)}`);
    }
    revalidatePath("/admin/universities");
    redirect("/admin/universities?msg=University+created");
  }

  async function createProgram(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.programs");
    const universityId = String(fd.get("universityId") ?? "");
    const course = String(fd.get("course") ?? "").trim().slice(0, 200);
    const courseDisplay = String(fd.get("courseDisplay") ?? "").trim().slice(0, 200) || course;
    const mode = String(fd.get("mode") ?? "") as "ONLINE" | "DISTANCE";
    const level = String(fd.get("level") ?? "").trim();
    if (!universityId || !course || !mode || !level) redirect(`/admin/universities?err=${encodeURIComponent("Course, mode, and level are required")}`);
    if (!["ONLINE", "DISTANCE"].includes(mode)) redirect(`/admin/universities?err=${encodeURIComponent("Mode must be ONLINE or DISTANCE")}`);
    const slug = slugify(courseDisplay) + "-" + mode.toLowerCase();
    if (!slug || slug === `-${mode.toLowerCase()}`) redirect(`/admin/universities?err=${encodeURIComponent("Course name produces an invalid slug")}`);
    const data = {
      universityId,
      slug,
      course,
      courseDisplay,
      mode,
      level,
      eligibilityText: String(fd.get("eligibilityText") ?? "").slice(0, 1500) || null,
      durationYears: fd.get("durationYears") ? Number(fd.get("durationYears")) : null,
      status: "UNDER_REVIEW" as const,
    };
    try {
      const p = await dbAdmin.program.create({ data });
      await audit(s, "program.create", "Program", p.id, null, data);
    } catch (e) {
      const msg = e instanceof Error && e.message.includes("Unique constraint")
        ? `A program with slug "${slug}" already exists for this university`
        : String(e instanceof Error ? e.message : e);
      redirect(`/admin/universities?err=${encodeURIComponent(msg)}`);
    }
    revalidatePath("/admin/universities");
    redirect("/admin/universities?msg=Program+created");
  }

  const uStatus = ["ACTIVE", "ON_HOLD", "NOT_AVAILABLE", "NO_FEE_DATA", "NO_DATA"];
  const vStatus = ["UNDER_REVIEW", "VERIFIED", "PUBLISHED", "EXPIRED"];
  return (
    <div>
      {searchParams.err && <p className="mb-3 rounded bg-red-100 px-4 py-2 text-sm text-red-800">Error: {searchParams.err}</p>}
      {searchParams.msg && <p className="mb-3 rounded bg-green-100 px-4 py-2 text-sm text-green-800">{searchParams.msg}</p>}
      <h1>Universities and programs</h1>
      <p className="muted mt-1">A university appears publicly only when status is Active and publication is Published. A program appears only when Published — a published program with no published fee shows "Contact us to confirm current fee". Eligibility is blank until you enter verified criteria.</p>

      {/* ---- Add University ---- */}
      <details className="card mt-4">
        <summary className="cursor-pointer font-medium text-navy">+ Add new university</summary>
        <form action={createUniversity} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><label className="label text-xs">Name <span className="text-red-500">*</span></label><input name="name" required className="field !min-h-9 !py-1 text-sm" placeholder="e.g. Amity University" /></div>
          <div><label className="label text-xs">Short name</label><input name="shortName" className="field !min-h-9 !py-1 text-sm" placeholder="e.g. Amity" /></div>
          <div><label className="label text-xs">Location</label><input name="location" className="field !min-h-9 !py-1 text-sm" placeholder="e.g. Noida, UP" /></div>
          <div className="sm:col-span-2"><label className="label text-xs">Website</label><input name="website" type="url" className="field !min-h-9 !py-1 text-sm" placeholder="https://..." /></div>
          <div className="sm:col-span-2"><label className="label text-xs">Description</label><textarea name="description" rows={2} className="field text-sm" /></div>
          <div className="sm:col-span-4 flex items-center gap-3">
            <button className="btn-primary !min-h-9 !py-1 text-sm">Create University</button>
            <span className="muted text-xs">Defaults: NO_DATA / Under Review. Slug auto-generated from name.</span>
          </div>
        </form>
      </details>

      {/* ---- Existing Universities ---- */}
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
              {/* ---- Add Program ---- */}
              <li className="py-3 border-t-2 border-dashed border-blue-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add program</p>
                <form action={createProgram} className="grid gap-2 sm:grid-cols-6">
                  <input type="hidden" name="universityId" value={u.id} />
                  <input name="course" required placeholder="Course (e.g. MBA)" className="field !min-h-9 !py-1 text-xs sm:col-span-2" />
                  <input name="courseDisplay" placeholder="Display name (optional)" className="field !min-h-9 !py-1 text-xs" />
                  <select name="mode" required className="field !min-h-9 !py-1 text-xs"><option value="">Mode...</option><option value="ONLINE">ONLINE</option><option value="DISTANCE">DISTANCE</option></select>
                  <select name="level" required className="field !min-h-9 !py-1 text-xs"><option value="">Level...</option>{levels.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                  <button className="btn-primary !min-h-9 !py-1 text-xs">Add</button>
                  <input name="durationYears" placeholder="Duration (yrs)" inputMode="decimal" className="field !min-h-9 !py-1 text-xs" />
                  <input name="eligibilityText" placeholder="Eligibility (optional)" className="field !min-h-9 !py-1 text-xs sm:col-span-3" />
                  <span className="muted text-xs sm:col-span-2">Slug auto-generated. Defaults to Under Review.</span>
                </form>
              </li>
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
