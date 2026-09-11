"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const examples = ["MBA", "BBA", "BCA", "MCA", "BA", "B.Com", "MA", "M.Com"];

export function SearchBox({ large = false, initial = "" }: { large?: boolean; initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  function go(e: FormEvent) { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q.trim())}`); }
  return (
    <form onSubmit={go} role="search" className="w-full">
      <label htmlFor="q" className={`label ${large ? "!text-sm md:!text-base !text-white/90 !mb-1.5" : ""}`}>What do you want to study?</label>
      <div className="flex gap-2">
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} className={`field ${large ? "!min-h-9 md:!min-h-10 !py-1.5 !rounded-xl !text-sm md:!text-base" : ""}`} placeholder="e.g. Online MBA, Distance BA" autoComplete="off" />
        <button type="submit" className={`btn-blue shrink-0 ${large ? "!min-h-8 md:!min-h-9 !px-3 md:!px-5" : ""}`}>
          <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        </button>
      </div>
      <div className="mt-2 md:mt-3 flex flex-wrap gap-1.5 md:gap-2">
        {examples.map((x) => (
          <button key={x} type="button" onClick={() => router.push(`/search?q=${encodeURIComponent(x)}`)} className={`chip ${large ? "!border-white/25 !bg-white/10 !text-white hover:!bg-white/20" : ""}`}>{x}</button>
        ))}
      </div>
    </form>
  );
}
