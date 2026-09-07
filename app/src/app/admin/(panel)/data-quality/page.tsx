import { revalidatePath } from "next/cache";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export default async function DataQualityPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ all?: string }> }) {
  const searchParams = await searchParamsPromise;
  await requireStaff("admin.data-quality");
  const findings = await dbAdmin.dataFinding.findMany({ where: searchParams.all ? {} : { resolved: false }, orderBy: [{ severity: "asc" }, { createdAt: "asc" }] });

  async function resolve(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.data-quality");
    const id = String(fd.get("id"));
    await dbAdmin.dataFinding.update({ where: { id }, data: { resolved: true, resolvedBy: s.id, resolvedAt: new Date() } });
    await audit(s, "finding.resolve", "DataFinding", id);
    revalidatePath("/admin/data-quality");
  }

  const tone = { ERROR: "border-red-300 bg-red-50", WARNING: "border-gold bg-gold-100/60", INFO: "border-line bg-white" } as const;
  return (
    <div>
      <h1>Data quality</h1>
      <p className="muted mt-1">Findings from the source-file import. Each one blocks or qualifies publication until a person has looked at it. Resolving a finding records who did it and when.</p>
      <div className="mt-3 text-sm"><a href={searchParams.all ? "/admin/data-quality" : "/admin/data-quality?all=1"} className="underline">{searchParams.all ? "Show open only" : "Show resolved too"}</a></div>
      <ul className="mt-4 space-y-3">
        {findings.map((f) => (
          <li key={f.id} className={`rounded-xl2 border p-4 ${tone[f.severity]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-navy">{f.severity} · {f.category}{f.sheet ? ` · ${f.sheet}${f.row ? ` row ${f.row}` : ""}` : ""}</p>
                <p className="mt-1 text-sm text-gray-800">{f.message}</p>
                {f.resolved && <p className="mt-1 text-xs text-gray-500">Resolved {f.resolvedAt?.toLocaleDateString("en-IN")}</p>}
              </div>
              {!f.resolved && <form action={resolve}><input type="hidden" name="id" value={f.id} /><button className="btn-outline !min-h-9 !py-1 text-sm">Mark resolved</button></form>}
            </div>
          </li>
        ))}
        {findings.length === 0 && <li className="muted">No open findings.</li>}
      </ul>
    </div>
  );
}
