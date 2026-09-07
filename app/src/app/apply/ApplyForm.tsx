"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { modeLabel } from "@/lib/format";

type U = { slug: string; name: string; programs: { slug: string; courseDisplay: string; mode: string; specializations: { name: string }[] }[] };

export function ApplyForm({ universities, initialUniversity, initialProgram, loggedIn }: { universities: U[]; initialUniversity?: string; initialProgram?: string; loggedIn: boolean }) {
  const router = useRouter();
  const [uni, setUni] = useState(initialUniversity ?? "");
  const [prog, setProg] = useState(initialProgram ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const u = useMemo(() => universities.find((x) => x.slug === uni), [uni, universities]);
  const p = useMemo(() => u?.programs.find((x) => x.slug === prog), [u, prog]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(null);
    track("application_started", { university: uni, course: p?.courseDisplay });
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(json.error ?? "Could not create the application."); return; }
    track("application_completed", { university: uni, course: p?.courseDisplay, application_code: json.applicationCode });
    router.push(`/student/applications/${json.id}?created=1`);
  }

  return (
    <form onSubmit={submit} className="card space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="university">University</label>
          <select id="university" name="universitySlug" className="field" value={uni} onChange={(e) => { setUni(e.target.value); setProg(""); }} required>
            <option value="">Select university</option>{universities.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
          </select></div>
        <div><label className="label" htmlFor="program">Program</label>
          <select id="program" name="programSlug" className="field" value={prog} onChange={(e) => setProg(e.target.value)} required disabled={!u}>
            <option value="">Select program</option>{u?.programs.map((x) => <option key={x.slug} value={x.slug}>{modeLabel(x.mode)} {x.courseDisplay}</option>)}
          </select></div>
        {p && p.specializations.length > 0 && (
          <div className="sm:col-span-2"><label className="label" htmlFor="spec">Specialization</label>
            <select id="spec" name="specialization" className="field" defaultValue=""><option value="">Decide later with advisor</option>{p.specializations.map((s) => <option key={s.name}>{s.name}</option>)}</select></div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="name">Full name (as on certificates)</label><input id="name" name="name" className="field" required minLength={2} autoComplete="name" /></div>
        <div><label className="label" htmlFor="mobile">Mobile</label><input id="mobile" name="mobile" className="field" required inputMode="numeric" autoComplete="tel" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="field" required autoComplete="email" /></div>
        <div><label className="label" htmlFor="dob">Date of birth</label><input id="dob" name="dateOfBirth" type="date" className="field" /></div>
        <div><label className="label" htmlFor="city">City</label><input id="city" name="city" className="field" /></div>
        <div><label className="label" htmlFor="qual">Highest qualification</label>
          <select id="qual" name="qualification" className="field" required defaultValue=""><option value="" disabled>Select</option>{["12th Pass", "Diploma", "Graduation", "Post Graduation", "Other"].map((q) => <option key={q}>{q}</option>)}</select></div>
        {!loggedIn && <div className="sm:col-span-2"><label className="label" htmlFor="password">Create a password for your dashboard</label><input id="password" name="password" type="password" className="field" required minLength={8} autoComplete="new-password" /><p className="muted mt-1">You&apos;ll log in with your mobile number and this password to upload documents and track progress.</p></div>}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn-gold w-full sm:w-auto">{busy ? "Creating application…" : "Create my application"}</button>
      <p className="text-xs text-gray-500">Documents (ID proof, photograph, certificates, marksheets) are uploaded in the next step. Fees are paid to the university as per its process; we do not collect university fees on this form.</p>
    </form>
  );
}
