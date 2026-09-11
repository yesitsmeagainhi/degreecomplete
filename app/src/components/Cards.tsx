import Link from "next/link";
import type { UniversityCard as UCard, ProgramHit } from "@/lib/catalog";
import { programHeadline } from "@/lib/catalog";
import { inr, modeLabel, levelLabel } from "@/lib/format";
import { site } from "@/lib/config";
import { CompareButton } from "./CompareTray";

export function UniversityCard({ u }: { u: UCard }) {
  return (
    <article className="group rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden border border-blue">
      {/* Mode strip */}
      <div className="bg-blue-100 px-5 py-2 border-b border-blue-200 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gold">{u.modes.map(modeLabel).join(" & ")}</span>
        <span className="text-[11px] font-semibold text-gray-500">{u.programCount} Programs</span>
      </div>

      {/* University name + location */}
      <div className="px-5 pt-4 pb-3">
        <h3 className="text-lg leading-snug font-bold text-gray-900">
          <Link href={`/universities/${u.slug}`} className="text-gray-900 no-underline hover:text-blue transition-colors">{u.name}</Link>
        </h3>
        {u.location && (
          <p className="mt-1.5 text-xs text-gray-600 flex items-center gap-1">
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            {u.location}
          </p>
        )}
      </div>

      {/* Courses available */}
      <div className="px-5 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Programs available</p>
        <div className="flex flex-wrap gap-1.5">
          {u.courses.slice(0, 6).map((c) => (
            <span key={c} className="rounded-full border border-blue/20 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue">{c}</span>
          ))}
          {u.courses.length > 6 && <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">+{u.courses.length - 6} more</span>}
        </div>
      </div>

      {/* Fee + CTA */}
      <div className="flex flex-col flex-1 px-5 pb-5">
        <div className="rounded-xl bg-gray-50 px-4 py-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total tuition from</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight text-navy">{inr(u.startingFee) ?? <span className="text-sm font-normal text-gray-500">{site.contactToConfirmFee}</span>}</p>
        </div>
        <Link href={`/universities/${u.slug}`} className="mt-auto inline-flex items-center justify-center w-full rounded-xl px-4 py-2.5 text-sm font-semibold no-underline bg-blue text-white hover:bg-blue-700 hover:shadow-md transition-all">View Programs →</Link>
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
      <div className="px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-3">
        <h3 className="text-base md:text-xl leading-snug font-bold text-navy break-words">
          <Link href={href} className="text-navy no-underline hover:text-blue transition-colors">{p.courseDisplay}</Link>
        </h3>
        <p className="mt-1 md:mt-1.5 text-xs md:text-sm text-gray-500">{p.university.name}</p>
        <div className="mt-2 md:mt-2.5 flex flex-wrap gap-1 md:gap-1.5">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 md:px-2.5 py-0.5 text-[10px] md:text-[11px] font-semibold text-blue">{modeLabel(p.mode)}</span>
          <span className="inline-flex items-center rounded-full bg-navy-50 px-2 md:px-2.5 py-0.5 text-[10px] md:text-[11px] font-semibold text-navy">{levelLabel(p.level)}</span>
          {p.specializations.slice(0, 3).map((s) => (
            <span key={s.name} className="rounded-full bg-gray-100 px-2 md:px-2.5 py-0.5 text-[10px] md:text-[11px] font-medium text-gray-600">{s.name}</span>
          ))}
          {p.specializations.length > 3 && <span className="rounded-full bg-gray-100 px-2 md:px-2.5 py-0.5 text-[10px] md:text-[11px] font-medium text-gray-400">+{p.specializations.length - 3}</span>}
        </div>
      </div>
      {/* Details */}
      <div className="flex flex-col flex-1 px-4 pb-4 md:px-5 md:pb-5">
        <div className="space-y-1.5 md:space-y-2 rounded-xl bg-gray-50 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Total Fee</span>
            <span className="font-semibold text-navy">{inr(fee) ?? "TBC"}{approx && fee ? "*" : ""}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Duration</span>
            <span className="font-semibold text-navy">{p.durationYears ? `${p.durationYears} Years` : "—"}</span>
          </div>
          {marks && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Min Marks</span>
              <span className="font-semibold text-navy">{marks}%</span>
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="mt-auto pt-2.5 md:pt-3 flex items-center gap-3">
          <Link href={href} className="no-underline text-xs font-semibold text-blue hover:text-blue-700 hover:underline transition-colors">View Course →</Link>
          <CompareButton id={p.id} label={p.course} />
        </div>
      </div>
    </article>
  );
}
