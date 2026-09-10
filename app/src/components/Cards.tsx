import Link from "next/link";
import type { UniversityCard as UCard, ProgramHit } from "@/lib/catalog";
import { programHeadline } from "@/lib/catalog";
import { inr, modeLabel, levelLabel } from "@/lib/format";
import { site } from "@/lib/config";
import { CompareButton } from "./CompareTray";

export function UniversityCard({ u }: { u: UCard }) {
  return (
    <article className="group rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-br from-navy-700 to-navy px-6 py-5">
        <h3 className="!text-white text-lg leading-snug font-semibold"><Link href={`/universities/${u.slug}`} className="!text-white no-underline hover:text-white/80 transition-colors">{u.name}</Link></h3>
        <div className="mt-2 flex items-center gap-2">
          {u.location && <span className="text-xs text-white/60 flex items-center gap-1"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>{u.location}</span>}
          {u.location && <span className="h-3 w-px bg-white/20" />}
          <span className="text-xs font-medium text-white/70">{u.modes.map(modeLabel).join(" & ")}</span>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-6">
        <div className="flex flex-wrap gap-1.5">
          {u.courses.slice(0, 6).map((c) => (
            <span key={c} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-medium text-navy/70">{c}</span>
          ))}
          {u.courses.length > 6 && <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-medium text-navy/50">+{u.courses.length - 6}</span>}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Fees from</p>
            <p className="mt-0.5 font-serif text-xl font-semibold text-navy">{inr(u.startingFee) ?? <span className="text-sm font-sans font-normal text-gray-400">{site.contactToConfirmFee}</span>}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Programs</p>
            <p className="mt-0.5 font-serif text-xl font-semibold text-navy">{u.programCount}</p>
          </div>
        </div>
        <Link href={`/universities/${u.slug}`} className="btn mt-auto pt-5 w-full no-underline bg-blue-50 text-navy hover:bg-blue-100 hover:shadow-md text-sm">View programs</Link>
      </div>
    </article>
  );
}

export function ProgramCard({ p }: { p: ProgramHit }) {
  const { fee, approx } = programHeadline(p);
  const href = `/programs/${p.university.slug}/${p.slug}`;
  const marks = p.minMarks?.replace(/%$/, "");
  return (
    <article className="group rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col border border-gray-100 border-l-4 border-l-blue">
      {/* Course name */}
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-xl leading-snug font-bold text-navy break-words">
          <Link href={href} className="text-navy no-underline hover:text-blue transition-colors">{p.courseDisplay}</Link>
        </h3>
        <p className="mt-1.5 text-sm text-gray-500">{p.university.name}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue">{modeLabel(p.mode)}</span>
          <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-semibold text-navy">{levelLabel(p.level)}</span>
          {p.specializations.slice(0, 3).map((s) => (
            <span key={s.name} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">{s.name}</span>
          ))}
          {p.specializations.length > 3 && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-400">+{p.specializations.length - 3}</span>}
        </div>
      </div>
      {/* Details */}
      <div className="flex flex-col flex-1 px-5 pb-5">
        <div className="space-y-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-2"><svg className="h-4 w-4 text-blue" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>Total Fee</span>
            <span className="font-semibold text-navy">{inr(fee) ?? "TBC"}{approx && fee ? "*" : ""}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-2"><svg className="h-4 w-4 text-blue" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Duration</span>
            <span className="font-semibold text-navy">{p.durationYears ? `${p.durationYears} Years` : "—"}</span>
          </div>
          {marks && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-2"><svg className="h-4 w-4 text-blue" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>Min Marks</span>
              <span className="font-semibold text-navy">{marks}%</span>
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="mt-auto pt-3 flex items-center gap-3">
          <Link href={href} className="no-underline text-xs font-semibold text-blue hover:text-blue-700 hover:underline transition-colors">View Course →</Link>
          <CompareButton id={p.id} label={p.course} />
        </div>
      </div>
    </article>
  );
}
