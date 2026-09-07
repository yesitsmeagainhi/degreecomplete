import Link from "next/link";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { dateLabel } from "@/lib/format";

export default async function ApplicationsPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await searchParamsPromise;
  await requireStaff("admin.applications");
  const apps = await dbAdmin.application.findMany({
    where: searchParams.status ? { status: searchParams.status as never } : {}, orderBy: { createdAt: "desc" }, take: 200,
    include: { university: { select: { name: true } }, program: { select: { courseDisplay: true, mode: true } }, documents: { select: { status: true } } },
  });
  return (
    <div>
      <h1>Applications</h1>
      <div className="mt-4 overflow-x-auto rounded-xl2 border border-line">
        <table className="w-full min-w-[800px] text-sm">
          <thead><tr className="bg-mist text-left"><th className="p-3">Application</th><th className="p-3">Student</th><th className="p-3">Program</th><th className="p-3">Documents</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead>
          <tbody>{apps.map((a) => (
            <tr key={a.id} className="border-t border-line"><td className="p-3"><Link href={`/admin/applications/${a.id}`} className="font-medium text-navy">{a.applicationCode}</Link></td><td className="p-3">{a.name}<br /><span className="text-xs text-gray-500">{a.mobile} · {a.email}</span></td><td className="p-3">{a.program.courseDisplay} ({a.program.mode.toLowerCase()})<br /><span className="text-xs text-gray-500">{a.university.name}{a.specialization ? ` · ${a.specialization}` : ""}</span></td><td className="p-3">{a.documents.filter((d) => d.status === "VERIFIED").length}/{a.documents.length} verified</td><td className="p-3">{a.status.toLowerCase().replaceAll("_", " ")}</td><td className="p-3">{dateLabel(a.createdAt)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      {apps.length === 0 && <p className="muted mt-4">No applications yet.</p>}
    </div>
  );
}
