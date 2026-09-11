"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";

export function FlipCard({ href, label, front, back }: { href: string; label: string; front: ReactNode; back: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={`flip-card${flipped ? " flipped" : ""}`} onClick={() => setFlipped((f) => !f)}>
      <div className="flip-card-inner">
        <div className="flip-card-front card border-blue/20 bg-blue-100/60 text-center flex flex-col items-center justify-center">
          {front}
          <Link href={href} className="mt-3 text-xs font-semibold text-blue no-underline hover:underline" onClick={(e) => e.stopPropagation()}>Explore &rarr;</Link>
        </div>
        <div className="flip-card-back">
          {back}
          <Link href={href} className="mt-3 text-xs font-semibold text-blue-200 no-underline hover:underline" onClick={(e) => e.stopPropagation()}>Explore {label} &rarr;</Link>
        </div>
      </div>
    </div>
  );
}
