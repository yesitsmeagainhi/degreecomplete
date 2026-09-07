import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db";
import { requireStaffApi } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const patch = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "COURSE_SELECTED", "DOCUMENTS_PENDING", "APPLICATION_STARTED", "APPLICATION_SUBMITTED", "ADMISSION_CONFIRMED", "CLOSED", "NOT_INTERESTED"]).optional(),
  counsellorId: z.string().nullable().optional(),
  followUpDate: z.string().nullable().optional(),
  notes: z.string().max(4000).optional(),
});

export async function PATCH(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const staff = await requireStaffApi("admin.leads");
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const before = await dbAdmin.lead.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const d = parsed.data;
  const after = await dbAdmin.lead.update({ where: { id: params.id }, data: { ...d, followUpDate: d.followUpDate ? new Date(d.followUpDate) : d.followUpDate === null ? null : undefined } });
  await audit(staff, "lead.update", "Lead", params.id, { status: before.status, counsellorId: before.counsellorId }, { status: after.status, counsellorId: after.counsellorId });
  return NextResponse.json({ ok: true });
}
