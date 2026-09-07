import Link from "next/link";
import { site, seoPages } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-navy text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-2xl">DegreeComplete<span className="text-blue">.in</span></p>
          <p className="mt-1 text-sm text-white/70">{site.institution}</p>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-white/70">
            An Online & Distance Education guidance platform. We help you explore programs from partner universities, compare fees, check eligibility and apply with support from admission to degree completion. We are not a university and do not award degrees.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <a href={`tel:${site.phone}`} className="inline-flex items-center gap-2 rounded-xl bg-blue/20 px-4 py-2.5 text-sm font-semibold text-blue-100 no-underline hover:bg-blue/30 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              {site.phoneDisplay}
            </a>
          </div>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">Explore</p>
          <ul className="space-y-2.5 text-sm text-white/80">
            <li><Link href="/universities" className="no-underline hover:text-blue-100 transition-colors">Universities</Link></li>
            <li><Link href="/search" className="no-underline hover:text-blue-100 transition-colors">All programs</Link></li>
            <li><Link href="/compare" className="no-underline hover:text-blue-100 transition-colors">Compare programs</Link></li>
            <li><Link href="/find-course" className="no-underline hover:text-blue-100 transition-colors">Find my course</Link></li>
            <li><Link href="/documents-required" className="no-underline hover:text-blue-100 transition-colors">Documents required</Link></li>
            <li><Link href="/admission-process" className="no-underline hover:text-blue-100 transition-colors">Admission process</Link></li>
            {Object.entries(seoPages).slice(0, 4).map(([slug, p]) => (
              <li key={slug}><Link href={`/${slug}`} className="no-underline hover:text-blue-100 transition-colors">{p.title}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">Company</p>
          <ul className="space-y-2.5 text-sm text-white/80">
            {[["about", "About us"], ["how-it-works", "How it works"], ["why-degreecomplete", "Why DegreeComplete"], ["faq", "FAQ"], ["contact", "Contact"], ["student/login", "Student login"], ["privacy-policy", "Privacy policy"], ["terms", "Terms & conditions"], ["refund-policy", "Refund & cancellation"], ["disclaimer", "Disclaimer"]].map(([s, l]) => (
              <li key={s}><Link href={`/${s}`} className="no-underline hover:text-blue-100 transition-colors">{l}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs leading-relaxed text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {site.institution}. All rights reserved.</p>
          <p className="max-w-prose">DegreeComplete.in is not the official website of any university. Fees and eligibility are subject to change as per university guidelines.</p>
        </div>
      </div>
    </footer>
  );
}
