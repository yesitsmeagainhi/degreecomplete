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
      <div><h1>{a.applicationCode}</h1><p className="muted mt-1">{a.name} · {a.mobile} · {a.email} · {a.city ?? ""} · {a.qualification ?? ""} · DOB {a.dateOfBirth ? dateLabel(a.dateOfBirth) : "—"}</p><p className="mt-1 text-gray-700">{a.program.courseDisplay} ({a.program.mode.toLowerCase()}) at {a.university.name}{a.specialization ? ` · ${a.specialization}` : ""}</p></div>
      <StatusSteps status={a.status} />
      <form action={updateStatus} className="card flex flex-wrap items-end gap-3">
        <div><label className="label">Set status</label><select name="status" defaultValue={a.status} className="field">{statuses.map((s) => <option key={s} value={s}>{s.toLowerCase().replaceAll("_", " ")}</option>)}</select></div>
        <div className="flex-1"><label className="label">Note (visible to student)</label><input name="note" className="field" /></div>
        <button className="btn-primary">Update</button>
      </form>
      <section>
        <h2>Documents</h2>
        <ul className="mt-3 space-y-3">{a.documents.map((d) => (
          <li key={d.id} className="card"><div className="flex flex-wrap items-center justify-between gap-2"><span><span className="font-medium text-navy">{d.type}</span> · {d.fileName} · {(d.sizeBytes / 1024).toFixed(0)} KB · {d.status.toLowerCase()}</span><a href={`/admin/applications/${a.id}/document/${d.id}`} className="text-sm underline">Open file</a></div>
            <form action={reviewDocument} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="documentId" value={d.id} /><input name="reviewNote" placeholder="Review note" defaultValue={d.reviewNote ?? ""} className="field max-w-xs !min-h-9 !py-1 text-sm" /><button name="docStatus" value="VERIFIED" className="btn-outline !min-h-9 !py-1 text-sm">Verify</button><button name="docStatus" value="REJECTED" className="btn-ghost !min-h-9 !py-1 text-sm">Reject</button></form></li>
        ))}{a.documents.length === 0 && <li className="muted">No documents uploaded.</li>}</ul>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <div><h2>Timeline</h2><ul className="mt-3 space-y-2 text-sm">{a.events.map((e) => <li key={e.id}><span className="font-medium text-navy">{e.status.toLowerCase().replaceAll("_", " ")}</span> — {e.note} <span className="text-gray-500">({dateLabel(e.createdAt)})</span></li>)}</ul></div>
        <div><h2>Messages to student</h2><form action={sendMessage} className="mt-3 flex gap-2"><input name="body" className="field" placeholder="Write a message…" /><button className="btn-primary">Send</button></form><ul className="mt-3 space-y-2 text-sm">{a.messages.map((m) => <li key={m.id} className="rounded-lg bg-mist p-2"><span className="font-medium text-navy">{m.fromRole}</span>: {m.body}</li>)}</ul></div>
      </section>
      <p className="muted">Staff {staff.name} — all actions on this page are written to the audit log.</p>
    </div>
  );
}
