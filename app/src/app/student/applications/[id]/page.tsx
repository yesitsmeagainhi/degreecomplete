import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStudent } from "@/lib/auth";
import { dbPublic } from "@/lib/db";
import { StatusSteps } from "@/components/StatusSteps";
import { DocumentUploader } from "@/components/DocumentUploader";
import { FeeTable } from "@/components/FeeTable";
import { publicFeeSelect } from "@/lib/catalog";
import { dateLabel } from "@/lib/format";
import { site } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Application", robots: { index: false } };

export default async function ApplicationPage({ params: paramsPromise, searchParams: searchParamsPromise }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [params, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);
  const s = await getStudent();
  if (!s) redirect("/student/login");
  const a = await dbPublic.application.findFirst({
    where: { id: params.id, studentId: s.id },
    select: {
      id: true, applicationCode: true, status: true, specialization: true, createdAt: true, name: true, mobile: true, email: true, city: true, qualification: true,
      university: { select: { name: true, slug: true } }, program: { select: { courseDisplay: true, slug: true, fees: { where: { status: "PUBLISHED" }, select: publicFeeSelect } } },
      documents: { select: { id: true, type: true, fileName: true, status: true, reviewNote: true, uploadedAt: true }, orderBy: { uploadedAt: "desc" } },
      events: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      messages: { select: { fromRole: true, body: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!a) notFound();
  return (
    <div className="container-x py-10">
      <nav className="muted mb-4"><Link href="/student/dashboard">Dashboard</Link> / {a.applicationCode}</nav>
      {searchParams.created && <div className="mb-6 rounded-xl2 border border-gold bg-gold-100 p-5"><p className="font-serif text-xl text-navy">Application created.</p><p className="mt-1">Your application ID is <span className="font-semibold">{a.applicationCode}</span>. Upload your documents below; our team will review them and contact you.</p></div>}
      <h1>{a.program.courseDisplay} — {a.university.name}</h1>
      <p className="muted mt-1">Application {a.applicationCode} · {dateLabel(a.createdAt)}{a.specialization ? ` · ${a.specialization}` : ""}</p>
      <div className="mt-6"><StatusSteps status={a.status} /></div>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2>Documents</h2>
          <p className="muted mt-1">JPG, PNG or PDF, up to 5 MB each.</p>
          <div className="mt-4"><DocumentUploader applicationId={a.id} /></div>
          <ul className="mt-4 divide-y divide-line rounded-xl2 border border-line">
            {a.documents.length === 0 && <li className="p-4 text-sm text-gray-600">No documents uploaded yet.</li>}
            {a.documents.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 p-4 text-sm"><span><span className="font-medium text-navy">{d.type.replace("_", " ")}</span> · {d.fileName}</span><span className={`chip ${d.status === "VERIFIED" ? "chip-active" : ""}`}>{d.status.toLowerCase()}</span></li>)}
          </ul>
        </section>
        <section>
          <h2>Timeline</h2>
          <ul className="mt-4 space-y-3">{a.events.map((e, i) => <li key={i} className="text-sm"><span className="font-medium text-navy">{e.status.replaceAll("_", " ").toLowerCase()}</span> — {e.note} <span className="text-gray-500">({dateLabel(e.createdAt)})</span></li>)}</ul>
          <h2 className="mt-8">Messages</h2>
          {a.messages.length === 0 ? <p className="muted mt-2">No messages yet. Your counsellor will write here, or call {site.phoneDisplay}.</p> : <ul className="mt-3 space-y-2">{a.messages.map((m, i) => <li key={i} className="rounded-lg bg-mist p-3 text-sm"><span className="font-medium text-navy">{m.fromRole}</span>: {m.body}</li>)}</ul>}
        </section>
      </div>
      <section className="mt-10">
        <h2>Fee information</h2>
        <p className="muted mt-1 mb-4">Published fee structure for your program. You pay the university directly as per its process; we will confirm the exact amount and plan before you pay.</p>
        <FeeTable fees={a.program.fees} course={a.program.courseDisplay} />
      </section>
    </div>
  );
}
