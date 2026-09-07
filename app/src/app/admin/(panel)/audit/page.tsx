import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";

export default async function AuditPage() {
  await requireStaff("admin.audit");
  const rows = await dbAdmin.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { actor: { select: { name: true } } } });
  return (
    <div>
      <h1>Audit log</h1>
      <div className="mt-4 overflow-x-auto rounded-xl2 border border-line"><table className="w-full min-w-[800px] text-sm"><thead><tr className="bg-mist text-left"><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Change</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-line align-top"><td className="p-3 whitespace-nowrap">{r.createdAt.toLocaleString("en-IN")}</td><td className="p-3">{r.actor?.name ?? "system"}<br /><span className="text-xs text-gray-500">{r.actorRole ?? ""} {r.ip ?? ""}</span></td><td className="p-3">{r.action}</td><td className="p-3">{r.entity} <span className="text-xs text-gray-500">{r.entityId}</span></td><td className="p-3 text-xs text-gray-600">{r.before ? `from ${JSON.stringify(r.before).slice(0, 120)} ` : ""}{r.after ? `to ${JSON.stringify(r.after).slice(0, 120)}` : ""}</td></tr>)}</tbody></table></div>
    </div>
  );
}
