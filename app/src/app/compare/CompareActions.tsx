"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompare } from "@/components/CompareTray";
import { track } from "@/lib/analytics";

export function CompareActions({ count }: { count: number }) {
  const { ids, clear } = useCompare();
  const router = useRouter();
  // Keep the URL in sync with the tray so the page is shareable
  useEffect(() => {
    const url = new URL(window.location.href);
    if (ids.join(",") !== (url.searchParams.get("ids") ?? "")) router.replace(ids.length ? `/compare?ids=${ids.join(",")}` : "/compare");
  }, [ids, router]);
  useEffect(() => { if (count >= 2) track("compare_completed", { count }); }, [count]);
  if (!ids.length) return null;
  return (
    <div className="mt-4 flex items-center gap-3">
      <p className="muted">{ids.length} of 4 selected</p>
      <button type="button" onClick={clear} className="text-sm text-navy underline">Clear all</button>
    </div>
  );
}
