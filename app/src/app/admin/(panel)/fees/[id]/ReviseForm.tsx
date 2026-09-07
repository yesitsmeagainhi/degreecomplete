"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const numeric = ["registrationFee", "applicationFee", "admissionFee", "alumniFee", "examFee", "tuitionPerSemester", "tuitionPerYear", "tuitionTotal", "semesterPlanFee", "annualPlanFee", "fullPlanFee", "totalProgramFee", "scholarshipTotalFee", "discountPct", "semesters", "durationYears"];
const text = ["examFeeBasis", "effectiveIntake", "sourceFile", "sourceSheet", "sourceRef", "eligibilityText", "notes"];

export function ReviseForm({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const changes: Record<string, unknown> = {};
    for (const k of numeric) { const v = String(fd.get(k) ?? "").trim(); if (v) changes[k] = Number(v); }
    for (const k of text) { const v = String(fd.get(k) ?? "").trim(); if (v) changes[k] = v; }
    const inst = String(fd.get("installments") ?? "").trim();
    if (inst) changes.installments = inst.split(",").map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
    const res = await fetch(`/api/admin/fees/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revise", changes }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { alert(json.error ?? "Failed"); return; }
    router.push(`/admin/fees/${json.newId}`);
  }
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
      {numeric.map((k) => <div key={k}><label className="label text-xs">{k}</label><input name={k} inputMode="decimal" className="field !min-h-9 !py-1 text-sm" /></div>)}
      <div><label className="label text-xs">installments (comma separated)</label><input name="installments" className="field !min-h-9 !py-1 text-sm" /></div>
      {text.map((k) => <div key={k} className={k === "notes" || k === "eligibilityText" ? "sm:col-span-3" : ""}><label className="label text-xs">{k}</label><input name={k} className="field !min-h-9 !py-1 text-sm" /></div>)}
      <div className="sm:col-span-3"><button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Create new version"}</button></div>
    </form>
  );
}
