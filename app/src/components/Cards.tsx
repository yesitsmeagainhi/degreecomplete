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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="!text-white text-base leading-snug"><Link href={`/universities/${u.slug}`} className="!text-white no-underline hover:text-white/80 transition-colors">{u.name}</Link></h3>
            {u.location && <p className="mt-1.5 text-xs text-white/50 flex items-center gap-1"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>{u.location}</p>}
          </div>
          <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/90 shrink-0">{u.modes.map(modeLabel).join(" & ")}</span>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-6">
        <p className="text-sm text-gray-500 leading-relaxed">{u.courses.slice(0, 6).join(", ")}{u.courses.length > 6 ? ` +${u.courses.length - 6} more` : ""}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-gray-50 px-3 py-3.5 text-center">
            <dt className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Programs</dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-navy">{u.programCount}</dd>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-3.5 text-center">
            <dt className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Fees from</dt>
            <dd className="mt-1 font-serif text-xl font-semibold text-navy">{inr(u.startingFee) ?? <span className="text-sm font-sans font-normal text-gray-400">{site.contactToConfirmFee}</span>}</dd>
          </div>
        </dl>
        <Link href={`/universities/${u.slug}`} className="btn mt-6 w-full no-underline bg-blue-100 text-navy hover:bg-blue-200 hover:shadow-md">View programs</Link>
      </div>
    </article>
  );
}

export function ProgramCard({ p }: { p: ProgramHit }) {
  const { fee, approx } = programHeadline(p);
  const href = `/programs/${p.university.slug}/${p.slug}`;
  return (
    <article className="group rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-br from-navy-700 to-navy px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="!text-white text-base leading-snug"><Link href={href} className="!text-white no-underline hover:text-white/80 transition-colors">{p.courseDisplay}</Link></h3>
            <p className="mt-1.5 text-xs text-white/50">{p.university.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/90">{modeLabel(p.mode)}</span>
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">{levelLabel(p.level)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-6">
        {p.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {p.specializations.slice(0, 3).map((s) => (
              <span key={s.name} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-medium text-navy/70">{s.name}</span>
            ))}
            {p.specializations.length > 3 && <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-medium text-navy/50">+{p.specializations.length - 3}</span>}
          </div>
        )}
        {/* Fee hero */}
        <div className="text-center py-3">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Total program fee</p>
          <p className="mt-1.5 font-serif text-3xl font-semibold text-navy">{inr(fee) ?? <span className="text-sm font-sans font-normal text-gray-400">{site.contactToConfirmFee}</span>}{approx && fee ? <span className="ml-1 text-xs font-sans font-normal text-gray-400">approx.</span> : null}</p>
        </div>
        {/* Quick stats row */}
        <div className="mt-3 flex items-center justify-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{p.durationYears ? `${p.durationYears} yrs` : "—"}</span>
          {p.minMarks && <><span className="h-3.5 w-px bg-gray-200" /><span>Min {p.minMarks}%</span></>}
        </div>
        {/* Actions */}
        <div className="mt-auto pt-5 border-t border-gray-100 flex items-center gap-2">
          <Link href={href} className="btn flex-1 no-underline bg-blue-50 text-navy hover:bg-blue-100 hover:shadow-md text-sm">View fees & eligibility</Link>
          <CompareButton id={p.id} label={p.course} />
        </div>
      </div>
    </article>
  );
}
