import { redirect } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { getStaff, type StaffSession } from "./auth";

/**
 * Module → roles allowed. SUPER_ADMIN is implicitly allowed everywhere.
 * Commercial/payout data is FINANCE + SUPER_ADMIN only.
 */
export const permissions: Record<string, StaffRole[]> = {
  "admin.dashboard": ["COUNSELLOR", "OPERATIONS", "FINANCE", "CONTENT_MANAGER"],
  "admin.leads": ["COUNSELLOR", "OPERATIONS"],
  "admin.applications": ["COUNSELLOR", "OPERATIONS"],
  "admin.documents": ["OPERATIONS", "COUNSELLOR"],
  "admin.universities": ["OPERATIONS", "CONTENT_MANAGER"],
  "admin.programs": ["OPERATIONS", "CONTENT_MANAGER"],
  "admin.fees": ["OPERATIONS"],
  "admin.fees.publish": ["OPERATIONS"],
  "admin.content": ["CONTENT_MANAGER", "OPERATIONS"],
  "admin.data-quality": ["OPERATIONS"],
  "admin.commercials": ["FINANCE"],
  "admin.payments": ["FINANCE"],
  "admin.reports": ["FINANCE", "OPERATIONS"],
  "admin.staff": [],
  "admin.audit": ["FINANCE"],
};

export function can(session: StaffSession | null, module: keyof typeof permissions) {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN") return true;
  return (permissions[module] ?? []).includes(session.role);
}

/** Server-side guard for admin pages/handlers. Redirects (pages) or throws (handlers). */
export async function requireStaff(module: keyof typeof permissions, opts: { redirectTo?: string } = {}) {
  const s = await getStaff();
  if (!s) redirect(opts.redirectTo ?? "/admin/login");
  if (!can(s, module)) redirect("/admin?denied=1");
  return s;
}

export async function requireStaffApi(module: keyof typeof permissions) {
  const s = await getStaff();
  if (!s || !can(s, module)) return null;
  return s;
}
