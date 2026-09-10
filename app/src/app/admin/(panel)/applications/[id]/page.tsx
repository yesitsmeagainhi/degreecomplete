import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { dateLabel } from "@/lib/format";
import { StatusSteps } from "@/components/StatusSteps";

const statuses = ["APPLICATION_RECEIVED", "DOCUMENTS_PENDING", "DOCUMENTS_UNDER_REVIEW", "DOCUMENTS_VERIFIED", "APPLICATION_SUBMITTED", "UNIVERSITY_PROCESSING", "ADMISSION_CONFIRMED", "NEXT_STEPS", "CLOSED"] as const;

export default async function AdminApplication({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const staff = await requireStaff("admin.applications");
  const a = await dbAdmin.application.findUnique({ where: { id: params.id }, include: { university: true, program: true, documents: { orderBy: { uploadedAt: "desc" } }, events: { orderBy: { createdAt: "desc" } }, messages: { orderBy: { createdAt: "desc" } } } });
  if (!a) notFound();

  async function updateStatus(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.applications");
    const status = String(fd.get("status")) as (typeof statuses)[number];
    const note = String(fd.get("note") ?? "");
    const before = await dbAdmin.application.findUnique({ where: { id: params.id }, select: { status: true } });
    await dbAdmin.application.update({ where: { id: params.id }, data: { status, events: { create: { status, note: note || `Status set by ${s.name}`, createdBy: s.id } } } });
    await audit(s, "application.status", "Application", params.id, before, { status, note });
    revalidatePath(`/admin/applications/${params.id}`);
  }
  async function reviewDocument(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.documents");
    const id = String(fd.get("documentId")); const status = String(fd.get("docStatus")) as "VERIFIED" | "REJECTED"; const reviewNote = String(fd.get("reviewNote") ?? "");
    await dbAdmin.document.update({ where: { id }, data: { status, reviewNote } });
    await audit(s, "document.review", "Document", id, undefined, { status, reviewNote });
    revalidatePath(`/admin/applications/${params.id}`);
  }
  async function sendMessage(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.applications");
    const body = String(fd.get("body") ?? "").trim();
    if (body) await dbAdmin.message.create({ data: { applicationId: params.id, fromRole: "counsellor", body: body.slice(0, 2000) } });
    await audit(s, "message.send", "Application", params.id);
    revalidatePath(`/admin/applications/${params.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>{a.applicationCode}</h1>
        <p className="mt-1 text-gray-700">{a.program.courseDisplay} ({a.program.mode.toLowerCase()}) at {a.university.name}{a.specialization ? ` · ${a.specialization}` : ""}</p>
      </div>

      {/* Student Details */}
      <section className="card">
        <h2 className="text-lg">Student details</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ["Name", a.name],
            ["Mobile", a.mobile],
            ["Email", a.email],
            ["City", a.city],
            ["Qualification", a.qualification],
            ["Date of birth", a.dateOfBirth ? dateLabel(a.dateOfBirth) : null],
            ["Specialization", a.specialization],
            ["Mode", a.program.mode.toLowerCase()],
          ] as [string, string | null][])
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-navy">{value}</dd>
              </div>
            ))}
        </dl>
      </section>

      <StatusSteps status={a.status} />
      <form action={updateStatus} className="card flex flex-wrap items-end gap-3">
        <div><label className="label">Set status</label><select name="status" defaultValue={a.status} className="field">{statuses.map((s) => <option key={s} value={s}>{s.toLowerCase().replaceAll("_", " ")}</option>)}</select></div>
        <div className="flex-1"><label className="label">Note (visible to student)</label><input name="note" className="field" /></div>
        <button className="btn-primary">Update</button>
      </form>
      <section className="card">
        <h2 className="text-lg">Documents</h2>
        {a.documents.length === 0
          ? <p className="muted mt-3">No documents uploaded yet.</p>
          : <ul className="mt-4 space-y-4">{a.documents.map((d) => (
              <li key={d.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-navy">{d.type.replaceAll("_", " ")}</span>
                    <span className="ml-2 text-sm text-gray-500">{d.fileName} · {(d.sizeBytes / 1024).toFixed(0)} KB</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`chip text-xs ${d.status === "VERIFIED" ? "chip-active" : d.status === "REJECTED" ? "border-red-200 text-red-600 bg-red-50" : ""}`}>{d.status.toLowerCase()}</span>
                    <a href={`/admin/applications/${a.id}/document/${d.id}`} className="text-sm font-medium text-blue underline-offset-4 hover:underline">Open file</a>
                  </div>
                </div>
                <form action={reviewDocument} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="documentId" value={d.id} />
                  <input name="reviewNote" placeholder="Review note" defaultValue={d.reviewNote ?? ""} className="field max-w-xs !min-h-9 !py-1 text-sm" />
                  <button name="docStatus" value="VERIFIED" className="btn-outline !min-h-9 !py-1 text-sm">Verify</button>
                  <button name="docStatus" value="REJECTED" className="btn-ghost !min-h-9 !py-1 text-sm text-red-600 hover:bg-red-50">Reject</button>
                </form>
              </li>
            ))}</ul>
        }
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <div><h2>Timeline</h2><ul className="mt-3 space-y-2 text-sm">{a.events.map((e) => <li key={e.id}><span className="font-medium text-navy">{e.status.toLowerCase().replaceAll("_", " ")}</span> — {e.note} <span className="text-gray-500">({dateLabel(e.createdAt)})</span></li>)}</ul></div>
        <div><h2>Messages to student</h2><form action={sendMessage} className="mt-3 flex gap-2"><input name="body" className="field" placeholder="Write a message…" /><button className="btn-primary">Send</button></form><ul className="mt-3 space-y-2 text-sm">{a.messages.map((m) => <li key={m.id} className="rounded-lg bg-mist p-2"><span className="font-medium text-navy">{m.fromRole}</span>: {m.body}</li>)}</ul></div>
      </section>
      <p className="muted">Staff {staff.name} — all actions on this page are written to the audit log.</p>
    </div>
  );
}
