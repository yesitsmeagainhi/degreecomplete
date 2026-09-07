import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudent } from "@/lib/auth";
import { dbPublic } from "@/lib/db";
import { StatusSteps } from "@/components/StatusSteps";
import { LogoutButton } from "@/components/AuthForm";
import { site } from "@/lib/config";
import { dateLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My dashboard", robots: { index: false } };

export default async function Dashboard() {
  const s = await getStudent();
  if (!s) redirect("/student/login");
  const apps = await dbPublic.application.findMany({
    where: { studentId: s.id }, orderBy: { createdAt: "desc" },
    select: { id: true, applicationCode: true, status: true, specialization: true, mode: true, createdAt: true, university: { select: { name: true, slug: true } }, program: { select: { courseDisplay: true, slug: true } }, documents: { select: { type: true, status: true } } },
  });
  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1>Hello, {s.name.split(" ")[0]}</h1><p className="muted mt-1">Your applications, documents and next steps.</p></div><LogoutButton kind="student" /></div>
      {apps.length === 0 ? (
        <div className="card mt-6 max-w-xl"><p className="font-medium text-navy">No applications yet.</p><Link href="/apply" className="btn-primary mt-4">Start an application</Link></div>
      ) : (
        <div className="mt-6 space-y-4">
          {apps.map((a) => {
            const pending = ["ID", "PHOTO", "QUALIFICATION_CERT", "MARKSHEET"].filter((t) => !a.documents.some((d) => d.type === t));
            return (
              <article key={a.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-serif text-xl text-navy">{a.program.courseDisplay} — {a.university.name}</p><p className="muted">Application {a.applicationCode} · started {dateLabel(a.createdAt)}{a.specialization ? ` · ${a.specialization}` : ""}</p></div>
                  <Link href={`/student/applications/${a.id}`} className="btn-outline !min-h-10 !py-2 text-sm">Open</Link>
                </div>
                <div className="mt-4"><StatusSteps status={a.status} /></div>
                {pending.length > 0 && <p className="mt-3 text-sm text-gray-700">Pending documents: {pending.map((p) => p.replace("_", " ").toLowerCase()).join(", ")}.</p>}
              </article>
            );
          })}
        </div>
      )}
      <div className="card mt-8 max-w-xl"><p className="font-medium text-navy">Your counsellor</p><p className="muted mt-1">Call or WhatsApp {site.phoneDisplay} for anything about your application, fees or dates.</p></div>
    </div>
  );
}
