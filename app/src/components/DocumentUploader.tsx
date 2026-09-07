"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const types = [["ID", "Aadhaar / ID proof"], ["PHOTO", "Photograph"], ["QUALIFICATION_CERT", "Qualification certificate"], ["MARKSHEET", "Marksheet"], ["OTHER", "Other document"]];

export function DocumentUploader({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const fd = new FormData(e.currentTarget); fd.set("applicationId", applicationId);
    const res = await fetch("/api/student/documents", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Uploaded. Our team will review it." : json.error ?? "Upload failed.");
    if (res.ok) { (e.target as HTMLFormElement).reset(); router.refresh(); }
  }
  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1"><label className="label" htmlFor="doc-type">Document type</label><select id="doc-type" name="type" className="field" required defaultValue="">{[["", "Select"], ...types].map(([v, l]) => <option key={v} value={v} disabled={!v}>{l}</option>)}</select></div>
      <div className="flex-1"><label className="label" htmlFor="doc-file">File</label><input id="doc-file" name="file" type="file" accept="image/jpeg,image/png,application/pdf" className="field" required /></div>
      <button type="submit" disabled={busy} className="btn-primary">{busy ? "Uploading…" : "Upload"}</button>
      {msg && <p className="text-sm text-gray-700 sm:basis-full" role="status">{msg}</p>}
    </form>
  );
}
