"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";

const KEY = "dc.compare";
const MAX = 4;
const listeners = new Set<() => void>();
const readIds = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
const writeIds = (ids: string[]) => { localStorage.setItem(KEY, JSON.stringify(ids)); listeners.forEach((l) => l()); };
const subscribe = (cb: () => void) => { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; };
let cache = "[]";
const getSnapshot = () => { const v = localStorage.getItem(KEY) ?? "[]"; if (v !== cache) cache = v; return cache; };

export function useCompare() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const ids: string[] = JSON.parse(raw);
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string, label?: string) => {
      const cur = readIds();
      if (cur.includes(id)) writeIds(cur.filter((x) => x !== id));
      else if (cur.length < MAX) { writeIds([...cur, id]); if (cur.length === 0) track("compare_started", { course: label }); }
      else alert(`You can compare up to ${MAX} programs. Remove one to add another.`);
    },
    clear: () => writeIds([]),
  };
}

export function CompareButton({ id, label }: { id: string; label: string }) {
  const { has, toggle } = useCompare();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const on = mounted && has(id);
  return (
    <button type="button" onClick={() => toggle(id, label)} aria-pressed={on} className={`chip ${on ? "chip-active" : ""}`}>
      {on ? "Added to compare" : "Add to compare"}
    </button>
  );
}

export function CompareTrayLink() {
  const { ids } = useCompare();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || ids.length === 0) return null;
  return (
    <Link href={`/compare?ids=${ids.join(",")}`} className="btn-outline !min-h-10 !py-2 text-sm">
      Compare ({ids.length})
    </Link>
  );
}
