"use client";
import { useState } from "react";
import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { track } from "@/lib/analytics";
import { inr, modeLabel } from "@/lib/format";
import { site } from "@/lib/config";

type Hit = { id: string; slug: string; courseDisplay: string; course: string; mode: string; level: string; durationYears: number | null; minMarks: string | null; university: { slug: string; name: string }; specializations: { name: string }[]; fee: number | null; approx: boolean };

const Q = {
  qualification: ["12th Pass", "Graduation", "Post Graduation", "Working Professional"],
  study: ["MBA", "BBA", "BCA", "MCA", "BA", "B.Com", "MA", "M.Com", "M.Sc", "Diploma / Certificate", "Not sure"],
  mode: ["Online", "Distance", "Either"],
  budget: [["Under ₹75,000", "75000"], ["₹75,000 – ₹1,50,000", "150000"], ["₹1,50,000 – ₹2,50,000", "250000"], ["Above ₹2,50,000", "9999999"]],
  objective: ["Career Growth", "Qualification Completion", "Higher Studies", "Flexible Learning", "Professional Upgrade"],
};

const Image = () => (
  <div className="hidden md:block">
    <div className="sticky top-28">
      <img src="/image/form.png" alt="Find your course" width={700} height={700} className="w-full h-auto object-contain" />
    </div>
  </div>
);

export function FindCourseWizard() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Record<string, string>>({});
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [gate, setGate] = useState<"closed" | "open" | "done">("closed");
  const [loading, setLoading] = useState(false);

  const pick = (k: string, v: string) => { setA({ ...a, [k]: v }); setStep(step + 1); };

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (a.study && a.study !== "Not sure" && a.study !== "Diploma / Certificate") p.set("course", a.study);
    if (a.study === "Diploma / Certificate") p.set("level", "Diploma");
    if (a.qualification) p.set("qualification", a.qualification);
    if (a.mode && a.mode !== "Either") p.set("mode", a.mode.toUpperCase());
    if (a.budget) p.set("maxFee", a.budget);
    p.set("sort", "fee_asc");
    const res = await fetch(`/api/search?${p.toString()}`);
    setHits(await res.json());
    setLoading(false);
  }

  const questions = [
    { key: "qualification", title: "What is your highest qualification?", opts: Q.qualification.map((x) => [x, x]) },
    { key: "study", title: "What do you want to study?", opts: Q.study.map((x) => [x, x]) },
    { key: "mode", title: "Preferred learning mode?", opts: Q.mode.map((x) => [x, x]) },
    { key: "budget", title: "What is your budget for the whole program?", opts: Q.budget },
    { key: "objective", title: "What is your primary objective?", opts: Q.objective.map((x) => [x, x]) },
  ];

  if (step < questions.length) {
    const q = questions[step];
    return (
      <div className="grid gap-10 md:grid-cols-2 items-start">
        <div className="card">
          <p className="muted">Question {step + 1} of {questions.length}</p>
          <p className="mt-1 font-serif text-2xl text-navy">{q.title}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {q.opts.map(([label, value]) => (
              <button key={value} type="button" onClick={() => { if (step === 0) track("eligibility_started", { source: "find-course" }); pick(q.key, value); }} className="btn-outline justify-start text-left">{label}</button>
            ))}
          </div>
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="mt-4 text-sm text-navy underline">Back</button>}
        </div>
        <Image />
      </div>
    );
  }

  if (gate !== "done") {
    return (
      <div className="grid gap-10 md:grid-cols-2 items-start">
        <div className="card">
          <p className="font-serif text-2xl text-navy">Almost there.</p>
          <p className="mt-2 text-gray-700">Tell us who to send the shortlist to. An advisor will also confirm eligibility and the current fee for each option — we don&apos;t guess those.</p>
          <div className="mt-5">
            <LeadForm
              compact
              title="Where should we send your shortlist?"
              context={{ source: "find-course", interestedCourse: a.study, mode: a.mode as "Online" | "Distance" | "Either", budget: a.budget, objective: a.objective }}
              onDone={() => { setGate("done"); load(); }}
            />
          </div>
          <button type="button" onClick={() => setStep(4)} className="mt-4 text-sm text-navy underline">Change my answers</button>
        </div>
        <Image />
      </div>
    );
  }

  return (
    <div>
      {/* Summary header */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-serif text-2xl text-navy">Your shortlist</p>
          {hits && hits.length > 0 && <span className="badge-blue">{hits.length} program{hits.length === 1 ? "" : "s"} found</span>}
        </div>
        <div className="rule mt-3" />
        <p className="muted mt-3">Based on: {a.qualification}, {a.study}, {a.mode}, budget up to {inr(Number(a.budget))}, goal &quot;{a.objective}&quot;.</p>
      </div>

      {/* Loading state */}
      {loading && <p className="muted mt-6 text-center">Finding programs…</p>}

      {/* Empty state */}
      {hits && hits.length === 0 && (
        <div className="card mt-6 text-center">
          <p className="font-serif text-xl text-navy">No published program matches all five answers.</p>
          <p className="muted mt-2">Your advisor already has your enquiry and will suggest the closest options, including programs still being verified.</p>
          <button type="button" onClick={() => { setStep(0); setGate("closed"); setHits(null); }} className="btn-outline mt-4">Try different answers</button>
        </div>
      )}

      {/* Program card grid */}
      {hits && hits.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hits.slice(0, 12).map((h) => {
            const href = `/programs/${h.university.slug}/${h.slug}`;
            return (
              <article key={h.id} className="rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden">
                <div className="bg-navy px-5 py-3 flex items-center justify-between gap-3">
                  <h3 className="!text-white text-base"><Link href={href} className="!text-white no-underline hover:text-blue-100 transition-colors">{h.courseDisplay}</Link></h3>
                  <span className="inline-flex items-center rounded-full bg-blue/20 px-2.5 py-0.5 text-xs font-semibold text-blue-100 shrink-0">{modeLabel(h.mode)}</span>
                </div>
                <div className="flex flex-col flex-1 p-5">
                  <p className="text-sm text-gray-500">{h.university.name}</p>
                  {h.specializations.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">{h.specializations.slice(0, 4).map((s) => s.name).join(", ")}{h.specializations.length > 4 ? ` +${h.specializations.length - 4}` : ""}</p>
                  )}
                  <div className="mt-4 rounded-xl bg-blue-50 p-4">
                    <p className="text-xs text-blue font-semibold uppercase tracking-wide">Total fee</p>
                    <p className="mt-1 font-serif text-2xl font-semibold text-navy">{inr(h.fee) ?? <span className="text-sm font-sans font-normal text-gray-500">{site.contactToConfirmFee}</span>}{h.approx && h.fee ? <span className="ml-1 text-xs font-sans font-normal text-gray-400">approx.</span> : null}</p>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                      <dt className="text-xs text-gray-400 uppercase tracking-wide">Duration</dt>
                      <dd className="mt-0.5 font-semibold text-navy">{h.durationYears ? `${h.durationYears} yrs` : "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                      <dt className="text-xs text-gray-400 uppercase tracking-wide">Min. marks</dt>
                      <dd className="mt-0.5 font-semibold text-navy">{h.minMarks ?? "—"}</dd>
                    </div>
                  </dl>
                  <Link href={href} className="btn-primary mt-auto pt-4 w-full">View fees &amp; eligibility</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="muted">{site.feeDisclaimer}</p>
        <button type="button" onClick={() => { setStep(0); setGate("closed"); setHits(null); }} className="text-sm text-navy underline">Start over</button>
      </div>
    </div>
  );
}
