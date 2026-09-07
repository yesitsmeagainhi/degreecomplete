import { notFound } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { inr, planLabel, dateLabel } from "@/lib/format";
import { FeeActions } from "../FeeActions";
import { ReviseForm } from "./ReviseForm";

export default async function FeeDetail({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  await requireStaff("admin.fees");
  const f = await dbAdmin.feeRecord.findUnique({ where: { id: params.id }, include: { program: { include: { university: true } }, verifiedBy: { select: { name: true } }, supersedes: { select: { id: true, feeCode: true, status: true } }, supersededBy: { select: { id: true, feeCode: true, status: true } } } });
  if (!f) notFound();
  const fields: [string, number | null][] = [["Registration", f.registrationFee], ["Application", f.applicationFee], ["Admission", f.admissionFee], ["Alumni", f.alumniFee], ["Exam", f.examFee], ["Tuition / semester", f.tuitionPerSemester], ["Tuition / year", f.tuitionPerYear], ["Tuition total", f.tuitionTotal], ["Semester plan", f.semesterPlanFee], ["Annual plan", f.annualPlanFee], ["Full plan", f.fullPlanFee], ["Total program fee", f.totalProgramFee], ["Scholarship total", f.scholarshipTotalFee]];
  return (
    <div className="space-y-6">
      <div><h1>{f.feeCode}</h1><p className="muted mt-1">{f.program.university.name} · {f.program.courseDisplay} ({f.program.mode.toLowerCase()}){f.specialization ? ` · ${f.specialization}` : ""} · {planLabel(f.planType)} · v{f.version}</p></div>
      <div className="flex flex-wrap items-center gap-3"><span className="chip">{f.status.toLowerCase().replaceAll("_", " ")}</span>{f.flags.map((x) => <span key={x} className="chip border-red-300 text-red-700">{x.replaceAll("_", " ")}</span>)}<FeeActions id={f.id} status={f.status} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card"><h3>Values in this version</h3><dl className="mt-2 text-sm">{fields.map(([k, v]) => <div key={k} className="flex justify-between border-b border-line py-1"><dt className="text-gray-600">{k}</dt><dd className="font-medium text-navy">{inr(v) ?? "—"}</dd></div>)}<div className="flex justify-between py-1"><dt className="text-gray-600">Exam basis</dt><dd>{f.examFeeBasis ?? "—"}</dd></div><div className="flex justify-between py-1"><dt className="text-gray-600">Instalments</dt><dd>{Array.isArray(f.installments) ? (f.installments as number[]).map((x) => inr(x)).join(", ") : "—"}</dd></div><div className="flex justify-between py-1"><dt className="text-gray-600">Duration</dt><dd>{f.durationYears ? `${f.durationYears} yrs` : "—"}{f.semesters ? ` / ${f.semesters} sems` : ""}</dd></div></dl>{f.notes && <p className="mt-3 text-xs text-gray-600">{f.notes}</p>}</div>
        <div className="card"><h3>Provenance</h3><dl className="mt-2 text-sm"><div className="py-1"><dt className="text-gray-600">Source file</dt><dd>{f.sourceFile}</dd></div><div className="py-1"><dt className="text-gray-600">Sheet / ref</dt><dd>{f.sourceSheet} · {f.sourceRef}</dd></div><div className="py-1"><dt className="text-gray-600">Effective intake</dt><dd>{f.effectiveIntake}{f.effectiveFrom ? ` (from ${dateLabel(f.effectiveFrom)})` : ""}{f.effectiveTo ? ` (to ${dateLabel(f.effectiveTo)})` : ""}</dd></div><div className="py-1"><dt className="text-gray-600">Verified</dt><dd>{f.verifiedBy ? `${f.verifiedBy.name} on ${dateLabel(f.verifiedAt)}` : "—"}</dd></div><div className="py-1"><dt className="text-gray-600">Published</dt><dd>{f.publishedAt ? dateLabel(f.publishedAt) : "—"}</dd></div><div className="py-1"><dt className="text-gray-600">Version chain</dt><dd>{f.supersedes ? `supersedes ${f.supersedes.feeCode} (${f.supersedes.status.toLowerCase()})` : "first version"}{f.supersededBy ? ` · superseded by ${f.supersededBy.feeCode}` : ""}</dd></div></dl></div>
      </div>
      <section className="card"><h3>Create a new version</h3><p className="muted mt-1">Enter only the fields that changed. The current version is expired and kept in history; the new version starts as Under review.</p><div className="mt-3"><ReviseForm id={f.id} /></div></section>
    </div>
  );
}
