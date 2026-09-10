import Link from "next/link";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { inr, planLabel } from "@/lib/format";
import { FeeActions } from "./FeeActions";
import { Pagination } from "@/components/Pagination";

const statuses = ["UNDER_REVIEW", "CONFLICT", "MISSING", "ON_HOLD", "NOT_AVAILABLE", "VERIFIED", "PUBLISHED", "EXPIRED", "DRAFT"];
const PER_PAGE = 50;

export default async function FeesPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ status?: string; university?: string; flagged?: string; page?: string }> }) {
  const searchParams = await searchParamsPromise;
  await requireStaff("admin.fees");
  const where = {
    ...(searchParams.status ? { status: searchParams.status as never } : {}),
    ...(searchParams.university ? { program: { university: { slug: searchParams.university } } } : {}),
    ...(searchParams.flagged ? { flags: { isEmpty: false } } : {}),
  };
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [fees, total, universities] = await Promise.all([
    dbAdmin.feeRecord.findMany({
      where,
      orderBy: [{ program: { university: { name: "asc" } } }, { program: { course: "asc" } }, { specialization: "asc" }],
      skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: { program: { select: { courseDisplay: true, mode: true, university: { select: { name: true, slug: true, status: true } } } } },
    }),
    dbAdmin.feeRecord.count({ where }),
    dbAdmin.university.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (searchParams.status) params.set("status", searchParams.status);
    if (searchParams.university) params.set("university", searchParams.university);
    if (searchParams.flagged) params.set("flagged", searchParams.flagged);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/fees${s ? `?${s}` : ""}`;
  };
  return (
    <div>
      <h1>Fee structures</h1>
      <p className="muted mt-1">Only records marked Published appear on the site. Verify first, then publish. Editing creates a new version; old versions are kept.</p>
      <form className="mt-4 flex flex-wrap gap-2">
        <select name="status" defaultValue={searchParams.status ?? ""} className="field max-w-xs"><option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{s.toLowerCase().replaceAll("_", " ")}</option>)}</select>
        <select name="university" defaultValue={searchParams.university ?? ""} className="field max-w-xs"><option value="">All universities</option>{universities.map((u) => <option key={u.slug} value={u.slug}>{u.name}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="flagged" value="1" defaultChecked={!!searchParams.flagged} /> Flagged only</label>
        <button className="btn-primary">Filter</button>
      </form>
      <p className="muted mt-3">{total} records</p>
      <div className="mt-2 overflow-x-auto rounded-xl2 border border-line">
        <table className="w-full min-w-[1000px] text-sm">
          <thead><tr className="bg-mist text-left"><th className="p-3">Fee ID</th><th className="p-3">University / program</th><th className="p-3">Plan</th><th className="p-3">Headline</th><th className="p-3">Source</th><th className="p-3">Status / flags</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{fees.map((f) => (
            <tr key={f.id} className={`border-t border-line align-top ${f.flags.length ? "bg-gold-100/40" : ""}`}>
              <td className="p-3"><Link href={`/admin/fees/${f.id}`} className="font-medium text-navy">{f.feeCode}</Link><br /><span className="text-xs text-gray-500">v{f.version} · {f.effectiveIntake}</span></td>
              <td className="p-3">{f.program.university.name}<br /><span className="text-gray-700">{f.program.courseDisplay} ({f.program.mode.toLowerCase()}){f.specialization ? ` · ${f.specialization}` : ""}</span></td>
              <td className="p-3">{planLabel(f.planType)}</td>
              <td className="p-3">{inr(f.totalProgramFee ?? f.fullPlanFee ?? f.tuitionTotal) ?? "—"}<br /><span className="text-xs text-gray-500">reg {inr(f.registrationFee) ?? "—"} · exam {inr(f.examFee) ?? "—"}</span></td>
              <td className="p-3 text-xs text-gray-600">{f.sourceFile}<br />{f.sourceSheet} · {f.sourceRef}</td>
              <td className="p-3"><span className="chip">{f.status.toLowerCase().replaceAll("_", " ")}</span>{f.flags.map((fl) => <span key={fl} className="mt-1 block text-xs text-red-700">{fl.replaceAll("_", " ")}</span>)}{f.program.university.status !== "ACTIVE" && <span className="mt-1 block text-xs text-red-700">university {f.program.university.status.toLowerCase().replaceAll("_", " ")}</span>}</td>
              <td className="p-3"><FeeActions id={f.id} status={f.status} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Pagination currentPage={page} totalPages={totalPages} href={pageHref} />
    </div>
  );
}
