import Link from "next/link";
import { requireStaff } from "@/lib/rbac";
import { can } from "@/lib/rbac";
import { LogoutButton } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff("admin.dashboard");
  const items: [string, string, Parameters<typeof can>[1]][] = [
    ["/admin", "Overview", "admin.dashboard"], ["/admin/leads", "Leads (CRM)", "admin.leads"], ["/admin/applications", "Applications", "admin.applications"],
    ["/admin/fees", "Fee structures", "admin.fees"], ["/admin/universities", "Universities & programs", "admin.universities"], ["/admin/content", "Content & FAQs", "admin.content"],
    ["/admin/data-quality", "Data quality", "admin.data-quality"], ["/admin/commercials", "Partner commercials", "admin.commercials"], ["/admin/audit", "Audit log", "admin.audit"],
  ];
  return (
    <div className="container-x grid gap-6 py-8 md:grid-cols-12">
      <aside className="md:col-span-3">
        <div className="card">
          <p className="font-serif text-lg text-navy">Admin</p>
          <p className="muted">{staff.name} · {staff.role.toLowerCase().replace("_", " ")}</p>
          <nav className="mt-4 flex flex-col gap-1" aria-label="Admin">
            {items.filter(([, , m]) => can(staff, m)).map(([href, label]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-navy no-underline hover:bg-navy-50">{label}</Link>)}
          </nav>
          <div className="mt-4"><LogoutButton kind="staff" /></div>
        </div>
      </aside>
      <div className="md:col-span-9">{children}</div>
    </div>
  );
}
