import Link from "next/link";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";

export default async function AdminHome({ searchParams: searchParamsPromise }: { searchParams: Promise<{ denied?: string }> }) {
  const searchParams = await searchParamsPromise;
  await requireStaff("admin.dashboard");
  const [leads, apps, fees, findings, universities] = await Promise.all([
    dbAdmin.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    dbAdmin.application.groupBy({ by: ["status"], _count: { _all: true } }),
    dbAdmin.feeRecord.groupBy({ by: ["status"], _count: { _all: true } }),
    dbAdmin.dataFinding.count({ where: { resolved: false } }),
    dbAdmin.university.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
  ]);
  const Card = ({ title, rows, href }: { title: string; rows: { k: string; n: number }[]; href: string }) => (
    <div className="card"><div className="flex items-baseline justify-between"><h3>{title}</h3><Link href={href} className="text-sm underline">Open</Link></div><dl className="mt-3 space-y-1 text-sm">{rows.length === 0 && <p className="muted">Nothing yet.</p>}{rows.map((r) => <div key={r.k} className="flex justify-between"><dt className="text-gray-600">{r.k.toLowerCase().replaceAll("_", " ")}</dt><dd className="font-medium text-navy">{r.n}</dd></div>)}</dl></div>
  );
  return (
    <div className="space-y-6">
      {searchParams.denied && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Your role doesn&apos;t have access to that module.</p>}
      <h1>Overview</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Leads by stage" href="/admin/leads" rows={leads.map((x) => ({ k: x.status, n: x._count._all }))} />
        <Card title="Applications by status" href="/admin/applications" rows={apps.map((x) => ({ k: x.status, n: x._count._all }))} />
        <Card title="Fee records by status" href="/admin/fees" rows={fees.map((x) => ({ k: x.status, n: x._count._all }))} />
        <Card title="Universities by publication" href="/admin/universities" rows={universities.map((x) => ({ k: x.verificationStatus, n: x._count._all }))} />
      </div>
      <div className="card"><p className="font-medium text-navy">{findings} open data-quality findings from the last import.</p><p className="muted mt-1">Records flagged as conflicting, missing, on hold or not available stay unpublished until someone verifies them. <Link href="/admin/data-quality" className="underline">Review findings</Link>.</p></div>
    </div>
  );
}
