"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function FeeActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: string) {
    if (action === "publish" && !confirm("Publish this fee to the public site?")) return;
    if (action === "expire" && !confirm("Mark this fee as expired? It will disappear from the site.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/fees/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    setBusy(false);
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "Failed");
    router.refresh();
  }
  return (
    <div className="flex flex-col gap-1">
      {["UNDER_REVIEW", "CONFLICT", "MISSING", "ON_HOLD", "NOT_AVAILABLE", "DRAFT"].includes(status) && <button disabled={busy} onClick={() => act("verify")} className="btn-outline !min-h-8 !px-3 !py-1 text-xs">Mark verified</button>}
      {status === "VERIFIED" && <button disabled={busy} onClick={() => act("publish")} className="btn-gold !min-h-8 !px-3 !py-1 text-xs">Publish</button>}
      {status === "PUBLISHED" && <button disabled={busy} onClick={() => act("expire")} className="btn-ghost !min-h-8 !px-3 !py-1 text-xs">Expire</button>}
    </div>
  );
}
