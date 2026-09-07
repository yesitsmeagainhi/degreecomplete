import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUniversity, programHeadline, getAdmissionSteps, getDocumentRequirements } from "@/lib/catalog";
import { inr, modeLabel, levelLabel } from "@/lib/format";
import { site, levelGuidance } from "@/lib/config";
import { LeadCta } from "@/components/LeadForm";
import { TrackView } from "@/components/Analytics";
import { CompareButton } from "@/components/CompareTray";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const u = await getUniversity(params.slug);
  if (!u) return { title: "University" };
  return { title: `${u.name} — Online & Distance programs, fees`, description: `${u.name}: ${u.programs.length} published programs. Compare fees, duration and specializations, check eligibility and apply with guidance.` };
}

export default async function UniversityPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const [u, steps, docs] = await Promise.all([getUniversity(params.slug), getAdmissionSteps(), getDocumentRequirements()]);
  if (!u) notFound();
  const levels = [...new Set(u.programs.map((p) => p.level))];
  const fin = u.financing[0];
  const ctx = { source: "university-page", universitySlug: u.slug, universityName: u.name };
  return (
    <div className="container-x py-10">
      <TrackView event="university_viewed" payload={{ university: u.slug }} />
      <nav className="muted mb-4" aria-label="Breadcrumb"><Link href="/universities">Universities</Link> / {u.name}</nav>
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <h1>{u.name}</h1>
          <p className="muted mt-2">{u.location}{u.website ? <> · <a href={u.website} rel="noopener nofollow" target="_blank" className="underline">Official website</a></> : null}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...new Set(u.programs.map((p) => p.mode))].map((m) => <span key={m} className="chip">{modeLabel(m)} mode</span>)}
            {levels.map((l) => <span key={l} className="chip">{levelLabel(l)}</span>)}
          </div>
          <section className="mt-8">
            <h2>Overview</h2>
            <p className="mt-3 max-w-prose leading-relaxed text-gray-700">{u.description ?? `${u.name} offers ${u.programs.length} published program${u.programs.length === 1 ? "" : "s"} through DegreeComplete.in. We are an admission-guidance platform for these programs and not the university's official website; degrees are awarded by the university.`}</p>
          </section>
          <section className="mt-8">
            <h2>Programs</h2>
            <div className="mt-4 divide-y divide-line rounded-xl2 border border-line bg-white">
              {u.programs.map((p) => {
                const { fee, approx } = programHeadline(p);
                return (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <Link href={`/programs/${u.slug}/${p.slug}`} className="font-semibold text-navy no-underline hover:text-gold-600">{p.courseDisplay}</Link>
                      <p className="muted">{modeLabel(p.mode)} · {levelLabel(p.level)}{p.durationYears ? ` · ${p.durationYears} years` : ""}{p.minMarks ? ` · min. marks ${p.minMarks}` : ""}{p.specializations.length ? ` · ${p.specializations.length} specializations` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="fee-figure text-xl">{fee ? `${approx ? "≈ " : ""}${inr(fee)}` : <span className="text-sm font-sans text-gray-600">{site.contactToConfirmFee}</span>}</span>
                      <CompareButton id={p.id} label={p.course} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="mt-8">
            <h2>Eligibility</h2>
            <ul className="mt-3 space-y-3 text-gray-700">
              {levels.map((l) => { const sample = u.programs.find((p) => p.level === l && p.eligibilityText); return <li key={l}><span className="font-medium text-navy">{levelLabel(l)}:</span> {sample?.eligibilityText ?? levelGuidance[l] ?? levelGuidance.Other}{sample?.minMarks ? <span className="muted"> Minimum marks: {sample.minMarks}.</span> : null}</li>; })}
            </ul>
            <p className="muted mt-2">Program-specific criteria are on each program page.</p>
          </section>
          <section className="mt-8">
            <h2>Documents required</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">{docs.filter((d) => d.mandatory === "Yes" || d.mandatory === "Yes (PG)").map((d) => <li key={d.num} className="card check text-sm text-navy" style={{ paddingLeft: "2.75rem" }}>{d.name}<span className="muted block">{d.requiredFor}</span></li>)}</ul>
            <Link href="/documents-required" className="mt-3 inline-block text-sm underline">Full checklist</Link>
          </section>
          <section className="mt-8">
            <h2>Fee information</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {u.registrationFeeText && <div className="card"><dt className="muted">Registration / prospectus fee</dt><dd className="font-semibold text-navy">{/^\d+(\.0)?$/.test(u.registrationFeeText) ? inr(Number(u.registrationFeeText)) : u.registrationFeeText}</dd></div>}
              {u.examFeeText && <div className="card"><dt className="muted">Examination fee</dt><dd className="font-semibold text-navy">{/^\d+(\.0)?$/.test(u.examFeeText) ? inr(Number(u.examFeeText)) : u.examFeeText}</dd></div>}
            </dl>
            <p className="muted mt-3">Program-wise fees, payment plans and instalments are on each program page. {site.feeDisclaimer}</p>
            {fin && (
              <p className="mt-3 text-gray-700">{fin.noLoan ? "Education loan / EMI options are not available for this university through us." : `Education loan / EMI options: ${fin.loanPartners ?? "available"}${fin.rateOfInterest ? ` (${fin.rateOfInterest})` : ""}${fin.appliesTo ? `, applicable on ${fin.appliesTo.toLowerCase()}` : ""}. Terms are set by the lender.`}</p>
            )}
          </section>
          <section className="mt-8">
            <h2>Admission process and support</h2>
            <ol className="mt-3 space-y-2">{steps.map((s) => <li key={s.step} className="card flex gap-4"><span className="font-serif text-2xl text-gold">{s.step}</span><div><p className="text-gray-800">{s.action}</p><p className="muted">{[s.who, s.timeline].filter(Boolean).join(" · ")}</p></div></li>)}</ol>
          </section>
        </div>
        <aside className="md:col-span-4">
          <div className="card sticky top-20">
            <p className="font-serif text-xl text-navy">Get details for {u.shortName ?? u.name}</p>
            <p className="muted mt-1">Eligibility, current fees and the next intake — from an advisor, not a bot.</p>
            <div className="mt-4 flex flex-col gap-2">
              <LeadCta context={ctx} label="Check eligibility" className="btn-gold w-full" />
              <Link href={`/apply?university=${u.slug}`} className="btn-primary w-full">Apply now</Link>
              <LeadCta context={ctx} label="Get fee details" className="btn-outline w-full" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
