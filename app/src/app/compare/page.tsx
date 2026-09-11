import type { Metadata } from "next";
import Link from "next/link";
import { getProgramsByIds, headlineFee, programHeadline, type PublicFee } from "@/lib/catalog";
import { inr, modeLabel, levelLabel, examBasisLabel } from "@/lib/format";
import { site, levelGuidance } from "@/lib/config";
import { CompareActions } from "./CompareActions";
import { LeadCta } from "@/components/LeadForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare programs", description: "Compare up to four Online and Distance programs side by side: fees, duration, eligibility and specializations." };

const std = (fees: PublicFee[]) => fees.filter((f) => f.planType === "STANDARD");
const first = <T,>(xs: (T | null | undefined)[]) => xs.find((x) => x !== null && x !== undefined) ?? null;

export default async function ComparePage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ ids?: string }> }) {
  const searchParams = await searchParamsPromise;
  const ids = (searchParams.ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const programs = await getProgramsByIds(ids);
  const rows: { label: string; get: (p: (typeof programs)[number]) => string | null }[] = [
    { label: "University", get: (p) => p.university.name },
    { label: "Course", get: (p) => p.courseDisplay },
    { label: "Mode", get: (p) => modeLabel(p.mode) },
    { label: "Level", get: (p) => levelLabel(p.level) },
    { label: "Duration", get: (p) => p.durationText ?? (p.durationYears ? `${p.durationYears} years` : null) },
    { label: "Maximum time allowed", get: (p) => (p.maxDurationYears ? `${p.maxDurationYears} years` : null) },
    { label: "Eligibility", get: (p) => p.eligibilityText ?? levelGuidance[p.level]?.split(".")[0] ?? null },
    { label: "Minimum marks", get: (p) => p.minMarks },
    { label: "Selection", get: (p) => p.selectionText },
    { label: "Documents required", get: (p) => (p.documents.length ? `${p.documents.length} items: ${p.documents.slice(0, 3).join("; ")}…` : null) },
    { label: "Specializations", get: (p) => (p.specializations.length ? `${p.specializations.length}: ${p.specializations.slice(0, 5).map((s) => s.name).join(", ")}${p.specializations.length > 5 ? "…" : ""}` : "General") },
    { label: "Registration fee", get: (p) => inr(first(std(p.fees).map((f) => f.registrationFee))) },
    { label: "Exam fee", get: (p) => { const f = std(p.fees).find((x) => x.examFee); return f ? `${inr(f.examFee)} ${examBasisLabel(f.examFeeBasis)}`.trim() : null; } },
    { label: "Semester fee", get: (p) => inr(first(std(p.fees).map((f) => f.tuitionPerSemester ?? f.semesterPlanFee))) },
    { label: "Annual fee", get: (p) => inr(first(std(p.fees).map((f) => f.tuitionPerYear ?? f.annualPlanFee))) },
    { label: "Total program fee", get: (p) => { const h = programHeadline(p); return h.fee ? `${h.approx ? "≈ " : ""}${inr(h.fee)}` : null; } },
    { label: "Loan / EMI", get: (p) => p.financingText },
    { label: "Scholarship / discounted plan", get: (p) => { const s = p.fees.find((f) => f.planType === "SCHOLARSHIP" || f.scholarshipTotalFee); return s ? inr(s.scholarshipTotalFee ?? headlineFee(s)) : null; } },
    { label: "Application process", get: () => "Apply on DegreeComplete, upload documents, we submit and follow up" },
    { label: "Support", get: () => "Eligibility check, documentation, application tracking, degree-completion support" },
  ];
  return (
    <div className="container-x py-10">
      <h1>Compare programs</h1>
      <p className="mt-3 max-w-prose text-gray-700">Add up to four programs from any program page or search result. Cells that differ between programs are highlighted.</p>
      <CompareActions count={programs.length} />
      {programs.length === 0 ? (
        <div className="card mt-6 max-w-xl"><p className="font-medium text-navy">Nothing to compare yet.</p><p className="muted mt-1">Use “Add to compare” on any program, then come back here.</p><Link href="/search" className="btn-blue mt-4">Browse programs</Link></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl2 border border-line">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-navy text-left text-white">
                <th className="p-3 font-medium">Field</th>
                {programs.map((p) => <th key={p.id} className="p-3 font-medium"><Link href={`/programs/${p.university.slug}/${p.slug}`} className="text-white">{p.courseDisplay}</Link><span className="block text-xs font-normal text-white/70">{p.university.name}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const vals = programs.map((p) => r.get(p));
                const differs = new Set(vals.map((v) => v ?? "—")).size > 1;
                return (
                  <tr key={r.label} className={`border-t border-line ${differs ? "bg-gold-100/60" : ""}`}>
                    <th scope="row" className="p-3 text-left font-medium text-navy">{r.label}</th>
                    {vals.map((v, i) => <td key={i} className="p-3 align-top text-gray-800">{v ?? <span className="text-gray-500">{site.contactToConfirm}</span>}</td>)}
                  </tr>
                );
              })}
              <tr className="border-t border-line">
                <th scope="row" className="p-3 text-left font-medium text-navy">Next step</th>
                {programs.map((p) => <td key={p.id} className="p-3"><LeadCta context={{ source: "compare", interestedCourse: p.course, universitySlug: p.university.slug, universityName: p.university.name, programSlug: p.slug }} label="Get details" className="btn-blue !min-h-10 !px-4 !py-2 text-sm" /></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="muted mt-4">{site.feeDisclaimer}</p>
    </div>
  );
}
