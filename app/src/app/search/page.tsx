import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { ProgramCard } from "@/components/Cards";
import { searchPrograms, parseSearchQuery, courseFamilies, type SearchFilters } from "@/lib/catalog";
import { LeadCta } from "@/components/LeadForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search programs", description: "Search Online and Distance programs by university, course, specialization or mode." };

type Q = { q?: string; course?: string; mode?: string; level?: string; maxFee?: string; sort?: string; university?: string; qualification?: string };

export default async function SearchPage({ searchParams: searchParamsPromise }: { searchParams: Promise<Q> }) {
  const searchParams = await searchParamsPromise;
  const parsed = searchParams.q ? parseSearchQuery(searchParams.q) : {};
  const filters: SearchFilters = {
    q: parsed.q, course: searchParams.course, level: searchParams.level, university: searchParams.university, qualification: searchParams.qualification,
    mode: (searchParams.mode as "ONLINE" | "DISTANCE") ?? parsed.mode,
    maxFee: searchParams.maxFee ? Number(searchParams.maxFee) : undefined,
    sort: (searchParams.sort as SearchFilters["sort"]) ?? "name",
  };
  const hits = await searchPrograms(filters);
  const link = (patch: Partial<Q>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) if (v) p.set(k, v);
    return `/search?${p.toString()}`;
  };
  const Chip = ({ k, v, label }: { k: keyof Q; v: string; label: string }) => (
    <Link href={link({ [k]: searchParams[k] === v ? "" : v })} className={`chip no-underline ${searchParams[k] === v ? "chip-active" : "hover:bg-navy-50"}`}>{label}</Link>
  );
  const title = searchParams.q ? `Results for “${searchParams.q}”` : searchParams.course ? `${searchParams.course} programs` : searchParams.qualification ? `Programs you can join after ${searchParams.qualification}` : "All programs";
  return (
    <div className="container-x py-10">
      <h1>{title}</h1>
      <div className="mt-6 max-w-2xl"><SearchBox initial={searchParams.q ?? ""} /></div>
      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap gap-2"><span className="muted self-center">My qualification:</span><Chip k="qualification" v="12th Pass" label="12th Pass" /><Chip k="qualification" v="Graduation" label="Graduate" /><Chip k="qualification" v="Working Professional" label="Working professional" /></div>
        <div className="flex flex-wrap gap-2"><Chip k="mode" v="ONLINE" label="Online" /><Chip k="mode" v="DISTANCE" label="Distance" /><Chip k="level" v="UG" label="UG" /><Chip k="level" v="PG" label="PG" /><Chip k="level" v="Diploma" label="Diploma" /><Chip k="level" v="Certificate" label="Certificate" /></div>
        <div className="flex flex-wrap gap-2">{courseFamilies.map((c) => <Chip key={c} k="course" v={c} label={c} />)}</div>
        <div className="flex flex-wrap gap-2">
          <Chip k="maxFee" v="75000" label="Under ₹75,000" /><Chip k="maxFee" v="150000" label="Under ₹1.5 lakh" /><Chip k="maxFee" v="250000" label="Under ₹2.5 lakh" />
          <span className="mx-1 self-center text-gray-400">|</span>
          <Chip k="sort" v="fee_asc" label="Lowest fee first" /><Chip k="sort" v="fee_desc" label="Highest fee first" />
        </div>
      </div>
      <p className="muted mt-6">{hits.length} program{hits.length === 1 ? "" : "s"}</p>
      {hits.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{hits.map((p) => <ProgramCard key={p.id} p={p} />)}</div>
      ) : (
        <div className="card mt-4 max-w-xl">
          <p className="font-medium text-navy">No published program matches this search.</p>
          <p className="muted mt-1">Try a broader term like “MBA” or “BCA”, or ask an advisor — some programs are still being verified and can be shared on request.</p>
          <div className="mt-4"><LeadCta context={{ source: "search-empty", interestedCourse: searchParams.q }} label="Ask an education expert" /></div>
        </div>
      )}
    </div>
  );
}
