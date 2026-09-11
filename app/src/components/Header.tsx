"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { site } from "@/lib/config";
import { CompareTrayLink } from "./CompareTray";

const nav = [
  { href: "/", label: "Home" },
  { href: "/universities", label: "Universities" },
  { href: "/search", label: "Programs" },
  { href: "/compare", label: "Compare" },
  { href: "/find-course", label: "Find my course" },
  { href: "/documents-required", label: "Documents" },
  { href: "/how-it-works", label: "How it works" },
];

export function Header() {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/98 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" className="no-underline" aria-label={`${site.name} home`}>
          <Image src="/image/dclogo.png" alt={site.name} width={220} height={50} priority className="h-16 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${isActive(n.href) ? "bg-blue-50 text-blue" : "text-gray-700 hover:bg-blue-50 hover:text-blue"}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <CompareTrayLink />
          <Link href="/find-course" className="btn-blue hidden !min-h-10 !rounded-xl !py-2 text-sm md:inline-flex">Check eligibility</Link>
          <details className="relative md:hidden">
            <summary className="btn-ghost !min-h-10 cursor-pointer list-none !px-3 text-sm" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </summary>
            <div className="fixed right-2 top-[4.5rem] w-60 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-card z-50">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className={`block rounded-xl px-4 py-2.5 no-underline ${isActive(n.href) ? "bg-blue-50 text-blue font-medium" : "text-navy hover:bg-blue-50"}`}>{n.label}</Link>
              ))}
              {/* <div className="my-1 border-t border-gray-100" />
              <Link href="/student/login" className="block rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue no-underline hover:bg-blue-100">Student login</Link> */}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
