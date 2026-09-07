import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db";
import { requireStaffApi } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

/**
 * PATCH /api/admin/fees/:id  { action: "verify" | "publish" | "expire" | "revise", changes?: {...}, note?: string }
 * - verify  : UNDER_REVIEW/CONFLICT/MISSING -> VERIFIED (records verifier)
 * - publish : VERIFIED -> PUBLISHED (also publishes program + university if needed)
 * - expire  : PUBLISHED -> EXPIRED
 * - revise  : creates a NEW version (supersedesId) with `changes`, old version -> EXPIRED. History preserved.
 */
export async function PATCH(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const staff = await requireStaffApi("admin.fees");
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const fee = await dbAdmin.feeRecord.findUnique({ where: { id: params.id } });
  if (!fee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ip = clientIp(req);
  const now = new Date();

  if (body.action === "verify") {
    const after = await dbAdmin.feeRecord.update({ where: { id: fee.id }, data: { status: "VERIFIED", verifiedById: staff.id, verifiedAt: now, flags: [] } });
    await audit(staff, "fee.verify", "FeeRecord", fee.id, { status: fee.status, flags: fee.flags }, { status: after.status, note: body.note }, ip);
    return NextResponse.json({ ok: true, status: after.status });
  }
  if (body.action === "publish") {
    if (fee.status !== "VERIFIED") return NextResponse.json({ error: "Verify the record before publishing." }, { status: 400 });
    const after = await dbAdmin.feeRecord.update({ where: { id: fee.id }, data: { status: "PUBLISHED", publishedAt: now } });
    await dbAdmin.program.update({ where: { id: fee.programId }, data: { status: "PUBLISHED", publishedAt: now } });
    const prog = await dbAdmin.program.findUnique({ where: { id: fee.programId }, select: { universityId: true } });
    await dbAdmin.university.update({ where: { id: prog!.universityId }, data: { verificationStatus: "PUBLISHED", publishedAt: now } });
    await audit(staff, "fee.publish", "FeeRecord", fee.id, { status: fee.status }, { status: after.status }, ip);
    return NextResponse.json({ ok: true, status: after.status });
  }
  if (body.action === "expire") {
    const after = await dbAdmin.feeRecord.update({ where: { id: fee.id }, data: { status: "EXPIRED", effectiveTo: now } });
    await audit(staff, "fee.expire", "FeeRecord", fee.id, { status: fee.status }, { status: after.status }, ip);
    return NextResponse.json({ ok: true, status: after.status });
  }
  if (body.action === "revise") {
    const allowed = ["registrationFee", "applicationFee", "admissionFee", "alumniFee", "examFee", "examFeeBasis", "tuitionPerSemester", "tuitionPerYear", "tuitionTotal", "semesterPlanFee", "annualPlanFee", "fullPlanFee", "totalProgramFee", "scholarshipTotalFee", "discountPct", "installments", "semesters", "durationYears", "notes", "eligibilityText", "effectiveIntake", "sourceFile", "sourceSheet", "sourceRef"];
    const changes: Record<string, unknown> = {};
    for (const k of allowed) if (k in (body.changes ?? {})) changes[k] = body.changes[k];
    const { id: _id, createdAt: _c, updatedAt: _u, supersedesId: _s, verifiedById: _v, verifiedAt: _va, publishedAt: _p, ...base } = fee;
    const next = await dbAdmin.feeRecord.create({
      data: { ...base, ...changes, feeCode: `${fee.feeCode.replace(/-v\d+$/, "")}-v${fee.version + 1}`, version: fee.version + 1, supersedesId: fee.id, status: "UNDER_REVIEW", flags: [], effectiveFrom: now, installments: (changes.installments ?? fee.installments ?? undefined) as object | undefined } as never,
    });
    await dbAdmin.feeRecord.update({ where: { id: fee.id }, data: { status: "EXPIRED", effectiveTo: now } });
    await audit(staff, "fee.revise", "FeeRecord", fee.id, fee, next, ip);
    return NextResponse.json({ ok: true, newId: next.id });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
