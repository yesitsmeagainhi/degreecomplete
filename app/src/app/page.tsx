import Link from "next/link";
import Image from "next/image";
import { SearchBox } from "@/components/SearchBox";
import { UniversityCard, ProgramCard } from "@/components/Cards";
import { LeadCta } from "@/components/LeadForm";
import { catalogueCounts, listUniversities, courseFamilyCounts, searchPrograms, getDocumentRequirements, getEligibilityRules } from "@/lib/catalog";
import { site, seoPages } from "@/lib/config";
import { inr } from "@/lib/format";

export const dynamic = "force-dynamic";

const paths = [
  { q: "12th Pass", icon: "M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.08 12.08 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z", title: "After 12th", body: "Start a BBA, BCA, BA or B.Com from home — graduate without pausing work or family.", cta: "See UG options" },
  { q: "Graduation", icon: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342", title: "After Graduation", body: "Move up with an MBA, MCA, MA, M.Com or M.Sc — no entrance exam at most universities.", cta: "See PG options" },
  { q: "Working Professional", icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0", title: "Working Professional", body: "Executive MBA, PG certificates and weekend-friendly online degrees that fit your job.", cta: "See flexible options" },
];

const trust = [
  { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", title: "Fees exactly as published", desc: "Registration, exam and tuition listed separately with every payment plan. No hidden charges." },
  { icon: "M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 012.625 1.25", title: "Documents verified first", desc: "Soft copies are pre-checked so your application is not rejected for a mismatch." },
  { icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z", title: "You pay the university directly", desc: "We never collect university fees. Your receipt is from the university." },
  { icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", title: "One counsellor, start to degree", desc: "The same person helps from shortlist to enrolment, exams and degree collection." },
  { icon: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z", title: "Eligibility checked first", desc: "An advisor confirms marks, subjects and documents against the university's rules before you apply." },
  { icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605", title: "Track everything in one place", desc: "Your dashboard shows application status, pending documents and messages." },
];

const steps = [
  { num: "01", title: "Tell us your goal", desc: "Qualification, budget, mode. We shortlist programs you're eligible for.", icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
  { num: "02", title: "Compare and choose", desc: "Fees, duration and specializations side by side.", icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" },
  { num: "03", title: "Apply with guidance", desc: "Documents pre-checked; you pay the university directly.", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { num: "04", title: "Track to your degree", desc: "Enrolment, exams and support in your dashboard.", icon: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" },
];

export default async function HomePage() {
  const [counts, universities, families, mbas, docs, rules] = await Promise.all([
    catalogueCounts(), listUniversities(), courseFamilyCounts(), searchPrograms({ course: "MBA", sort: "fee_asc" }), getDocumentRequirements(), getEligibilityRules(),
  ]);
  const familyList = ["MBA", "BBA", "BCA", "MCA", "BA", "B.Com", "MA", "M.Com"]
    .map((c) => {
      const count = families[c] ?? 0;
      const unis = universities.filter((u) => u.courses.includes(c));
      const modes = [...new Set(unis.flatMap((u) => u.modes))].sort();
      const level = ["MBA", "MCA", "MA", "M.Com"].includes(c) ? "PG" : "UG";
      const fees = unis.map((u) => u.courseFees[c]).filter((f): f is number => f !== undefined).sort((a, b) => a - b);
      const lowestFee = fees[0] ?? null;
      const duration = level === "PG" ? "2 years" : "3 years";
      const eligibility = level === "PG" ? "Bachelor's degree required" : "12th pass / equivalent";
      return { course: c, count, uniCount: unis.length, modes, level, lowestFee, duration, eligibility };
    })
    .filter((f) => f.count > 0);
  const featured = universities.slice(0, 6);
  const mandatoryDocs = docs.filter((d) => d.mandatory === "Yes").slice(0, 5);
  const ugRule = rules.find((r) => r.levelLabel.startsWith("BA / BBA"));
  const pgRule = rules.find((r) => r.levelLabel.startsWith("MBA (PG"));

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero-gradient relative overflow-hidden text-white">
        <div className="container-x grid gap-10 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <div className="badge-gold mb-5">Online & Distance Education Guidance</div>
            <h1 className="!text-white text-4xl md:text-[3.25rem] leading-[1.08]">{site.tagline}</h1>
            <div className="rule mt-6" />
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-white/85">
              Explore Online & Distance Degree Programs from Leading Universities — Compare Courses, Fees and Eligibility in One Place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/universities" className="btn-gold">Explore universities</Link>
              <Link href="/find-course" className="btn-white">Find my course</Link>
            </div>
          </div>
          <div className="md:col-span-5 md:pt-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
              <SearchBox large />
            </div>
            {counts.universities > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-serif text-3xl font-semibold text-gold">{counts.universities}+</p>
                  <p className="mt-1 text-xs text-white/70">Universities</p>
                </div>
                <div>
                  <p className="font-serif text-3xl font-semibold text-gold">{counts.programs}+</p>
                  <p className="mt-1 text-xs text-white/70">Programs</p>
                </div>
                <div>
                  <p className="font-serif text-3xl font-semibold text-gold">{counts.specializations}+</p>
                  <p className="mt-1 text-xs text-white/70">Specializations</p>
                </div>
              </div>
            )}
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
              <Image src="/seal-256.png" alt="" width={32} height={32} className="h-8 w-8 opacity-90" />
              <span>{site.institution} — a guidance platform, not a university.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── START FROM WHERE YOU ARE ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="container-x">
          <div className="section-heading">
            <h2>Start from where you are</h2>
            <p>Pick your current qualification and we'll show programs you can actually join.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {paths.map((p) => (
              <Link key={p.q} href={`/search?qualification=${encodeURIComponent(p.q)}`} className="group card card-blue-top no-underline hover:border-blue">
                <div className="icon-circle-blue mb-4 group-hover:bg-blue group-hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={p.icon} /></svg>
                </div>
                <p className="font-serif text-2xl text-navy group-hover:text-blue transition-colors">{p.title}</p>
                <p className="mt-2 text-gray-600">{p.body}</p>
                <p className="mt-4 font-semibold text-blue group-hover:text-blue-700">{p.cta} &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── POPULAR COURSES ── */}
      {familyList.length > 0 && (
        <section className="bg-blue-50 py-16 md:py-20">
          <div className="container-x">
            <div className="section-heading">
              <h2>Popular courses</h2>
              <p>Programs with verified, published details ready to compare.</p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {familyList.map((f) => (
                <Link key={f.course} href={`/search?course=${encodeURIComponent(f.course)}`} className="flip-card no-underline block">
                  <div className="flip-card-inner">
                    {/* Front */}
                    <div className="flip-card-front card card-blue-top text-center">
                      <p className="font-serif text-3xl text-navy">{f.course}</p>
                      <p className="mt-2 text-sm font-semibold text-blue">{f.count} program{f.count === 1 ? "" : "s"}</p>
                      <p className="mt-1 text-xs text-gray-400">{f.uniCount} universit{f.uniCount === 1 ? "y" : "ies"}</p>
                    </div>
                    {/* Back */}
                    <div className="flip-card-back">
                      <div>
                        <p className="font-serif text-xl text-gold">{f.course}</p>
                        <p className="mt-1 text-xs text-white/60 uppercase tracking-wide">{f.level === "PG" ? "Postgraduate" : "Undergraduate"}</p>
                      </div>
                      <div className="mt-3 space-y-2.5 text-sm">
                        {f.lowestFee && (
                          <p className="flex items-center gap-2 text-white/80">
                            <svg className="h-3.5 w-3.5 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                            Fees from {inr(f.lowestFee)}
                          </p>
                        )}
                        <p className="flex items-center gap-2 text-white/80">
                          <svg className="h-3.5 w-3.5 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Duration: {f.duration}
                        </p>
                        <p className="flex items-center gap-2 text-white/80">
                          <svg className="h-3.5 w-3.5 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {f.eligibility}
                        </p>
                        <p className="flex items-center gap-2 text-white/80">
                          <svg className="h-3.5 w-3.5 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79" /></svg>
                          {f.modes.map((m) => m === "DISTANCE" ? "Distance" : "Online").join(" & ")} mode
                        </p>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-gold">Explore {f.course} &rarr;</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── MBA COMPARE ── */}
      {mbas.length > 0 && (
        <section className="hero-gradient py-16 md:py-20">
          <div className="container-x">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold mb-3">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  Most popular
                </div>
                <h2 className="!text-white">Online MBA — compare at a glance</h2>
                <p className="mt-2 text-sm text-white/70">Lowest published total fee first. Open any program for the full breakdown.</p>
              </div>
              <Link href="/online-mba" className="btn-white hidden sm:inline-flex">All MBA programs</Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{mbas.slice(0, 6).map((p) => <ProgramCard key={p.id} p={p} />)}</div>
            <Link href="/online-mba" className="btn-white mt-6 w-full sm:hidden">All MBA programs</Link>
          </div>
        </section>
      )}

      {/* ── PARTNER UNIVERSITIES ── */}
      <section className="bg-blue-50 py-16 md:py-20">
        <div className="container-x">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2>Partner universities</h2>
              <p className="muted mt-2">Every university here has programs with verified, published details.</p>
            </div>
            <Link href="/universities" className="btn-outline hidden sm:inline-flex">All universities</Link>
          </div>
          {featured.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{featured.map((u) => <UniversityCard key={u.slug} u={u} />)}</div>
          ) : (
            <div className="card mt-8">
              <p className="font-medium text-navy">University listings are being verified.</p>
              <p className="muted mt-1">Our advisors can share current options right now.</p>
            </div>
          )}
          <Link href="/universities" className="btn-outline mt-6 w-full sm:hidden">All universities</Link>
        </div>
      </section>

      {/* ── WHY TRUST US ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="container-x">
          <div className="section-heading">
            <h2>Why students trust DegreeComplete</h2>
            <p>Transparent guidance from application to degree completion.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {trust.map((t) => (
              <div key={t.title} className="card card-blue-left hover:border-blue">
                <div className="icon-circle-blue mb-4">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
                </div>
                <p className="font-semibold text-navy">{t.title}</p>
                <p className="muted mt-2">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ELIGIBILITY & DOCUMENTS ── */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="container-x grid gap-8 md:grid-cols-2">
          <div>
            <h2>Am I eligible?</h2>
            <p className="muted mt-2">The rules most partner universities follow. Your advisor confirms the exact criteria for the program you choose.</p>
            {ugRule && (
              <div className="card card-orange-top mt-5 hover:border-gold">
                <div className="badge-gold mb-3">Undergraduate (BA, BBA, B.Com, BCA)</div>
                <p className="text-sm text-gray-700">{ugRule.eligibility}</p>
                <p className="muted mt-3">Minimum marks: <span className="font-semibold text-navy">{ugRule.minMarks}</span> &middot; Duration: <span className="font-semibold text-navy">{ugRule.duration}</span></p>
              </div>
            )}
            {pgRule && (
              <div className="card card-blue-top mt-4 hover:border-blue">
                <div className="badge-blue mb-3">Postgraduate (MBA, MCA, MA, M.Com)</div>
                <p className="text-sm text-gray-700">{pgRule.eligibility}</p>
                <p className="muted mt-3">Minimum marks: <span className="font-semibold text-navy">{pgRule.minMarks}</span> &middot; Duration: <span className="font-semibold text-navy">{pgRule.duration}</span></p>
              </div>
            )}
            <div className="mt-5">
              <LeadCta context={{ source: "home-eligibility" }} label="Check my eligibility" />
            </div>
          </div>
          <div>
            <h2>Documents you'll need</h2>
            <p className="muted mt-2">Clear soft copies (PDF/JPG). Verified before admission is processed.</p>
            <ul className="mt-5 space-y-3">
              {mandatoryDocs.map((d) => (
                <li key={d.num} className="card card-blue-left !p-4 check" style={{ paddingLeft: "2.75rem" }}>
                  <span className="text-sm font-medium text-navy">{d.name}</span>
                  <span className="muted block mt-0.5">{d.requiredFor}{d.format ? ` · ${d.format}` : ""}</span>
                </li>
              ))}
            </ul>
            <Link href="/documents-required" className="btn-outline mt-5">Full document checklist</Link>
          </div>
        </div>
      </section>

      {/* ── HOW ADMISSION WORKS ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="container-x">
          <div className="section-heading">
            <h2>How admission works</h2>
            <p>Four simple steps from enquiry to enrolment.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {steps.map((s) => (
              <div key={s.num} className="card card-blue-top text-center hover:border-blue">
                <div className="icon-circle-blue mx-auto mb-4">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                </div>
                <p className="font-serif text-4xl text-gold">{s.num}</p>
                <p className="mt-2 font-semibold text-navy">{s.title}</p>
                <p className="muted mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="muted mt-6 text-center">Most partner universities run two intakes a year (January and July). Ask an advisor which intake you can still join.</p>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="hero-gradient py-16 md:py-20">
        <div className="container-x grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-8 border-t-4 border-blue shadow-lg">
            <div className="icon-circle-blue mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
            </div>
            <p className="font-serif text-2xl text-navy">Not sure which program fits?</p>
            <p className="mt-3 text-gray-600">Five questions. We shortlist programs that match your qualification, budget and goal, and an advisor confirms eligibility.</p>
            <Link href="/find-course" className="btn-primary mt-6 w-full">Find my course</Link>
          </div>
          <div className="rounded-2xl bg-white p-8 border-t-4 border-gold shadow-lg">
            <div className="icon-circle-orange mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            </div>
            <p className="font-serif text-2xl text-navy">Talk to an education expert</p>
            <p className="mt-3 text-gray-600">Real fees, real eligibility, no pressure. Call or WhatsApp {site.phoneDisplay}.</p>
            <div className="mt-6">
              <LeadCta context={{ source: "home" }} label="Get a call back" className="btn-gold w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ── POPULAR SEARCHES ── */}
      <section className="bg-white py-14">
        <div className="container-x">
          <h2>Popular searches</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(seoPages).map(([slug, p]) => (
              <Link key={slug} href={`/${slug}`} className="chip no-underline">{p.title}</Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
