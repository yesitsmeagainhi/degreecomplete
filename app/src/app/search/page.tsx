import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";
import { ProgramCard } from "@/components/Cards";
import { searchPrograms, parseSearchQuery, type SearchFilters } from "@/lib/catalog";
import { LeadCta } from "@/components/LeadForm";
import { Pagination, paginate } from "@/components/Pagination";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search programs", description: "Search Online and Distance programs by university, course, specialization or mode." };

type Q = { q?: string; course?: string; mode?: string; level?: string; maxFee?: string; sort?: string; university?: string; qualification?: string; page?: string };
const PER_PAGE = 12;

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
  const { items: paged, currentPage, totalPages, totalItems } = paginate(hits, Number(searchParams.page) || 1, PER_PAGE);
  const pageHref = (p: number) => link({ page: p > 1 ? String(p) : "" });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-700 to-blue py-6 md:py-14">
        <div className="container-x">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-xl md:text-4xl font-bold text-white">Explore All Programs</h1>
            <p className="mt-1 md:mt-2 text-xs md:text-base text-blue-100">Search and compare verified online & distance programs from UGC-entitled universities.</p>
          </div>
          <div className="mt-4 md:mt-6 max-w-2xl mx-auto hidden md:block">
            <SearchBox initial={searchParams.q ?? ""} large />
          </div>
        </div>
      </section>

      <div className="container-x py-5 md:py-8">
        {/* Mobile search bar */}
        <div className="md:hidden mb-4">
          <SearchBox initial={searchParams.q ?? ""} />
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-50 px-4 py-3 border border-blue-100 mb-6">
          <p className="text-sm font-medium text-navy"><span className="font-bold text-blue">{totalItems}</span> program{totalItems === 1 ? "" : "s"}</p>
          <p className="text-xs font-semibold text-green-700 bg-green-100 rounded-full px-3 py-1">EMI Available</p>
        </div>

        {/* Cards */}
        {paged.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{paged.map((p) => <ProgramCard key={p.id} p={p} />)}</div>
            <Pagination currentPage={currentPage} totalPages={totalPages} href={pageHref} />
          </>
        ) : (
          <div className="card max-w-xl">
            <p className="font-medium text-navy">No published program matches this search.</p>
            <p className="muted mt-1">Try a broader term like &quot;MBA&quot; or &quot;BCA&quot;, or ask an advisor — some programs are still being verified and can be shared on request.</p>
            <div className="mt-4"><LeadCta context={{ source: "search-empty", interestedCourse: searchParams.q }} label="Ask an education expert" /></div>
          </div>
        )}
      </div>
    </div>
  );
}
