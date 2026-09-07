"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ kind, next }: { kind: "staff" | "student"; next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(`/api/auth/${kind}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Login failed."); return; }
    router.push(next); router.refresh();
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      {kind === "staff" ? (
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="field" required autoComplete="username" /></div>
      ) : (
        <div><label className="label" htmlFor="mobile">Mobile number</label><input id="mobile" name="mobile" inputMode="numeric" className="field" required autoComplete="username" /></div>
      )}
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" className="field" required autoComplete="current-password" /></div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function LogoutButton({ kind }: { kind: "staff" | "student" }) {
  const router = useRouter();
  return <button type="button" className="btn-ghost !min-h-10 !py-2 text-sm" onClick={async () => { await fetch(`/api/auth/${kind}/logout`, { method: "POST" }); router.push(kind === "staff" ? "/admin/login" : "/"); router.refresh(); }}>Sign out</button>;
}
