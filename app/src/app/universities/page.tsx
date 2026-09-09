import type { Metadata } from "next";
import Link from "next/link";
import { UniversityCard } from "@/components/Cards";
import { listUniversities, courseFamilies } from "@/lib/catalog";
import { site } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Universities", description: "All partner universities offering Online and Distance programs, with published fees and program lists." };

type Q = { mode?: string; level?: string; course?: string; budget?: string; duration?: string };
const budgets: [string, number][] = [["Under ₹75,000", 75000], ["Under ₹1,50,000", 150000], ["Under ₹2,50,000", 250000]];

export default async function UniversitiesPage({ searchParams: searchParamsPromise }: { searchParams: Promise<Q> }) {
  const searchParams = await searchParamsPromise;
  const all = await listUniversities();
  const q = searchParams;
  const list = all.filter((u) => {
    if (q.mode && !u.modes.includes(q.mode)) return false;
    if (q.level && !u.levels.includes(q.level)) return false;
    if (q.course && !u.courses.includes(q.course)) return false;
    if (q.budget && (u.startingFee === null || u.startingFee > Number(q.budget))) return false;
    return true;
  });
  const link = (patch: Partial<Q>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) p.set(k, v as string);
    const s = p.toString();
    return `/universities${s ? `?${s}` : ""}`;
  };
  const Chip = ({ k, v, label }: { k: keyof Q; v: string; label: string }) => (
    <Link href={link({ [k]: q[k] === v ? "" : v })} className={`chip no-underline ${q[k] === v ? "chip-active" : "hover:bg-navy-50"}`}>{label}</Link>
  );

  return (
    <div className="container-x py-10">
      <div className="max-w-2xl">
        <h1>Universities</h1>
        <p className="mt-3 text-gray-600 leading-relaxed">Every university listed here has programs with verified, published details. Starting fees are the lowest published total program fee for a degree program.</p>
      </div>
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Filter by</p>
        <div className="flex flex-wrap gap-2"><Chip k="mode" v="ONLINE" label="Online" /><Chip k="mode" v="DISTANCE" label="Distance" /><Chip k="level" v="UG" label="UG" /><Chip k="level" v="PG" label="PG" /><Chip k="level" v="Diploma" label="Diploma" /></div>
        <div className="flex flex-wrap gap-2">{courseFamilies.slice(0, 9).map((c) => <Chip key={c} k="course" v={c} label={c} />)}</div>
        <div className="flex flex-wrap gap-2">{budgets.map(([l, v]) => <Chip key={v} k="budget" v={String(v)} label={l} />)}{Object.values(q).some(Boolean) && <Link href="/universities" className="chip no-underline text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300">Clear filters</Link>}</div>
      </div>
      <p className="muted mt-6">{list.length} of {all.length} universities</p>
      {list.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{list.map((u) => <UniversityCard key={u.slug} u={u} />)}</div>
      ) : (
        <div className="card mt-4"><p className="font-medium text-navy">No published university matches these filters.</p><p className="muted mt-1">Clear a filter, or {site.contactToConfirm.toLowerCase()} — our advisors know options that are still being verified.</p></div>
      )}
    </div>
  );
}
