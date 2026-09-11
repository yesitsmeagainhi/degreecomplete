import type { Metadata } from "next";
import { UniversityCard } from "@/components/Cards";
import { listUniversities } from "@/lib/catalog";
import { SearchBox } from "@/components/SearchBox";
import { LeadCta } from "@/components/LeadForm";
import { site } from "@/lib/config";
import { Pagination, paginate } from "@/components/Pagination";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Universities", description: "All partner universities offering Online and Distance programs, with published fees and program lists." };

type Q = { page?: string };
const PER_PAGE = 12;

export default async function UniversitiesPage({ searchParams: searchParamsPromise }: { searchParams: Promise<Q> }) {
  const searchParams = await searchParamsPromise;
  const all = await listUniversities();
  const { items: paged, currentPage, totalPages, totalItems } = paginate(all, Number(searchParams.page) || 1, PER_PAGE);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/universities${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-700 to-blue py-8 md:py-16">
        <div className="container-x">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] md:text-xs font-semibold text-white/90 mb-3 md:mb-4">
              <svg className="h-3 w-3 md:h-3.5 md:w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              UGC-DEB & AICTE Entitled Only
            </span>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">Discover Top Verified Online & Distance Universities</h1>
            <p className="mt-2 md:mt-4 text-xs md:text-lg text-blue-100 leading-relaxed">Compare UGC-DEB entitled, NAAC accredited universities with published fees and 0% interest EMI options.</p>
          </div>
          <div className="mt-5 md:mt-8 max-w-2xl mx-auto">
            <SearchBox initial="" large />
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <div className="border-b border-blue-100 bg-blue-50/50">
        <div className="container-x py-3 md:py-4 flex flex-wrap justify-center gap-3 md:gap-8">
          {[
            { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text: "100% UGC-DEB Entitled" },
            { icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z", text: "NAAC A++ & A+ Accredited" },
            { icon: "M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5", text: "AICTE Approved" },
            { icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z", text: "0% Interest EMI" },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-1.5 md:gap-2">
              <svg className="h-4 w-4 md:h-5 md:w-5 text-blue shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={b.icon} /></svg>
              <span className="text-[10px] md:text-sm font-semibold text-navy whitespace-nowrap">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA banner */}
      <div className="container-x pt-5 md:pt-8">
        <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 px-5 md:px-8 py-4 md:py-5 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          <div>
            <p className="text-sm md:text-lg font-bold text-navy">Confused about which university fits your career & budget?</p>
            <p className="mt-0.5 text-xs md:text-sm text-gray-600">Our advisors help you pick the right program with EMI options.</p>
          </div>
          <LeadCta context={{ source: "universities-cta" }} label="Talk to an Advisor" className="btn-blue shrink-0 !text-sm" />
        </div>
      </div>

      <div className="container-x py-5 md:py-8">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-2xl font-bold text-navy">All Partner Universities</h2>
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs md:text-sm font-bold text-blue">{totalItems}</span>
          </div>
          <span className="text-xs md:text-sm font-semibold text-green-700 bg-green-100 rounded-full px-3 py-1 self-start md:self-auto">EMI Available</span>
        </div>

        {paged.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{paged.map((u) => <UniversityCard key={u.slug} u={u} />)}</div>
            <Pagination currentPage={currentPage} totalPages={totalPages} href={pageHref} />
          </>
        ) : (
          <div className="card mt-5"><p className="font-medium text-navy">No published university found.</p><p className="muted mt-1">{site.contactToConfirm} — our advisors know options that are still being verified.</p></div>
        )}
      </div>
    </div>
  );
}
