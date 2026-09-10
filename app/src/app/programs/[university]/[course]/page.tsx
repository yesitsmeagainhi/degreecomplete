import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgram, programHeadline, getAdmissionSteps, getSiteNotes } from "@/lib/catalog";
import { FeeTable } from "@/components/FeeTable";
import { LeadCta } from "@/components/LeadForm";
import { TrackView } from "@/components/Analytics";
import { CompareButton } from "@/components/CompareTray";
import { modeLabel, levelLabel, inr } from "@/lib/format";
import { site, levelGuidance } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ university: string; course: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const p = await getProgram(params.university, params.course);
  if (!p) return { title: "Program" };
  const { fee, approx } = programHeadline(p);
  return {
    title: `${modeLabel(p.mode)} ${p.courseDisplay} — ${p.university.name}${fee ? ` — fees ${approx ? "approx. " : "from "}${inr(fee)}` : ""}`,
    description: `${modeLabel(p.mode)} ${p.courseDisplay} at ${p.university.name}: eligibility, minimum marks, documents required, duration, fee structure and payment plans. Check eligibility and apply with guidance.`,
  };
}

export default async function ProgramPage({ params: paramsPromise }: { params: Promise<{ university: string; course: string }> }) {
  const params = await paramsPromise;
  const [p, steps, notes] = await Promise.all([getProgram(params.university, params.course), getAdmissionSteps(), getSiteNotes()]);
  if (!p) notFound();
  const u = p.university;
  const ctx = { source: "program-page", interestedCourse: p.course, universitySlug: u.slug, universityName: u.name, programSlug: p.slug, mode: modeLabel(p.mode) as "Online" | "Distance" };
  const eligibility = p.eligibilityText ?? p.fees.find((f) => f.eligibilityText)?.eligibilityText ?? null;
  const { fee, approx } = programHeadline(p);
  const duration = p.durationText ?? (p.durationYears ? `${p.durationYears} years` : null);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Course", name: `${modeLabel(p.mode)} ${p.courseDisplay}`,
    provider: { "@type": "CollegeOrUniversity", name: u.name, sameAs: u.website ?? undefined },
    description: `${modeLabel(p.mode)} ${p.courseDisplay} from ${u.name}, listed on ${site.name} (an education guidance platform).`,
  };
  const Fact = ({ k, v }: { k: string; v: string }) => <div className="rounded-lg bg-blue-50 p-3"><dt className="text-xs text-gray-600">{k}</dt><dd className="font-semibold text-navy">{v}</dd></div>;
  return (
    <div className="container-x py-10">
      <TrackView event="course_viewed" payload={{ university: u.slug, course: p.course, mode: p.mode, level: p.level }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="muted mb-4" aria-label="Breadcrumb"><Link href="/universities">Universities</Link> / <Link href={`/universities/${u.slug}`}>{u.name}</Link> / {p.courseDisplay}</nav>
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="badge-blue">{modeLabel(p.mode)} · {levelLabel(p.level)}</p>
          <h1 className="mt-2">{p.courseDisplay}</h1>
          <p className="mt-2 text-lg text-gray-700">{u.name}{u.location ? `, ${u.location}` : ""}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact k="Duration" v={duration ?? "Confirm with advisor"} />
            <Fact k="Maximum time allowed" v={p.maxDurationYears ? `${p.maxDurationYears} years` : p.durationText ? "As per UGC" : "—"} />
            <Fact k="Semesters" v={p.semestersText ?? (p.semesters ? String(p.semesters) : "—")} />
            <Fact k="Total fee" v={fee ? `${approx ? "≈ " : ""}${inr(fee)}` : site.contactToConfirmFee} />
          </dl>

          <section className="card mt-8 border-green-100 bg-green-100/30" id="eligibility">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2>Are you eligible?</h2>{p.minMarks && <span className="badge-green">Minimum marks: {p.minMarks}</span>}</div>
            {eligibility ? <p className="mt-3 max-w-prose leading-relaxed text-gray-800">{eligibility}</p> : <p className="mt-3 max-w-prose text-gray-700">{levelGuidance[p.level] ?? levelGuidance.Other}</p>}
            {p.selectionText && <p className="mt-3 text-sm text-gray-700"><span className="font-semibold text-navy">Selection:</span> {p.selectionText}</p>}
            {notes.reservation_note && <p className="muted mt-2">{notes.reservation_note}</p>}
            <div className="mt-4 flex flex-wrap gap-3"><LeadCta context={ctx} label="Check my eligibility" /><Link href={`/apply?university=${u.slug}&program=${p.slug}`} className="btn-blue">Apply now</Link></div>
          </section>

          {p.specializations.length > 0 && (
            <section className="mt-8">
              <h2>Specializations</h2>
              <ul className="mt-3 flex flex-wrap gap-2">{p.specializations.map((s) => <li key={s.name} className="chip">{s.name}</li>)}</ul>
            </section>
          )}

          <section className="mt-8" id="fees">
            <TrackView event="fee_viewed" payload={{ university: u.slug, course: p.course, mode: p.mode }} />
            <h2>Fee structure</h2>
            <p className="muted mt-1 mb-4">One-time, semester, annual and total figures are shown exactly as published by the university for this intake. You pay the university directly.</p>
            <FeeTable fees={p.fees} course={p.courseDisplay} approx={p.totalFeeApprox} />
            {p.financingText && <div className="card mt-4"><p className="font-semibold text-navy">Loan / EMI / discounts</p><p className="mt-1 text-sm text-gray-700">{p.financingText}</p><p className="muted mt-1">Terms are set by the lender or university; an advisor will confirm what applies to you.</p></div>}
          </section>

          {p.documents.length > 0 && (
            <section className="mt-8" id="documents">
              <h2>Documents required</h2>
              <p className="muted mt-1">{notes.process_note ?? "Clear soft copies (PDF/JPG). Verified before admission is processed."}</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">{p.documents.map((d, i) => <li key={i} className="card check text-sm text-navy" style={{ paddingLeft: "2.75rem" }}>{d}</li>)}</ol>
              {notes.abc_note && <p className="muted mt-3">{notes.abc_note}</p>}
              <Link href="/documents-required" className="mt-3 inline-block text-sm underline">Full checklist with formats and conditions</Link>
            </section>
          )}

          <section className="mt-8">
            <h2>Admission process</h2>
            <ol className="mt-3 space-y-2">{steps.map((s) => <li key={s.step} className="card flex gap-4"><span className="font-serif text-2xl text-gold">{s.step}</span><div><p className="text-gray-800">{s.action}</p><p className="muted">{[s.who, s.timeline].filter(Boolean).join(" · ")}</p></div></li>)}</ol>
          </section>

          {p.notes && <section className="mt-8"><h2>Good to know</h2><p className="mt-3 max-w-prose text-gray-700">{p.notes}</p></section>}
          <p className="muted mt-8">{notes.disclaimer ?? site.feeDisclaimer}</p>
        </div>

        <aside className="md:col-span-4">
          <div className="card sticky top-20">
            <p className="font-serif text-xl text-navy">{p.courseDisplay} at {u.shortName ?? u.name}</p>
            <dl className="mt-3 space-y-1 text-sm text-gray-700">
              {duration && <div className="flex justify-between"><dt>Duration</dt><dd className="font-semibold text-navy">{duration}</dd></div>}
              {p.minMarks && <div className="flex justify-between"><dt>Minimum marks</dt><dd className="font-semibold text-navy">{p.minMarks}</dd></div>}
              <div className="flex justify-between"><dt>Total fee</dt><dd className="font-semibold text-navy">{fee ? `${approx ? "≈ " : ""}${inr(fee)}` : "Confirm"}</dd></div>
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              <LeadCta context={ctx} label="Check eligibility" className="btn-blue w-full" />
              <Link href={`/apply?university=${u.slug}&program=${p.slug}`} className="btn-primary w-full">Apply now</Link>
              <LeadCta context={ctx} label="Get fee details on WhatsApp" className="btn-outline w-full" />
              <div className="pt-1"><CompareButton id={p.id} label={p.course} /></div>
            </div>
            <p className="muted mt-4">{site.feeDisclaimer}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
