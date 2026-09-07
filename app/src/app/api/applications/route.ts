import { NextResponse } from "next/server";
import { dbPublic } from "@/lib/db";
import { applicationSchema } from "@/lib/validation";
import { nextCode } from "@/lib/ids";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getStudent, hashPassword, issueStudentSession, normaliseMobile } from "@/lib/auth";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`apps:${ip}`, 5, 10 * 60 * 1000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const existing = await getStudent();
  const schema = existing ? applicationSchema.omit({ password: true }).extend({ password: applicationSchema.shape.password.optional() }) : applicationSchema;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  const d = parsed.data;

  const university = await dbPublic.university.findFirst({ where: { slug: d.universitySlug, status: "ACTIVE", verificationStatus: "PUBLISHED" }, select: { id: true } });
  if (!university) return NextResponse.json({ error: "University not available." }, { status: 400 });
  const program = await dbPublic.program.findFirst({ where: { universityId: university.id, slug: d.programSlug, status: "PUBLISHED" }, select: { id: true, mode: true } });
  if (!program) return NextResponse.json({ error: "Program not available." }, { status: 400 });

  const mobile = normaliseMobile(d.mobile);
  let studentId = existing?.id;
  if (!studentId) {
    const found = await dbPublic.studentUser.findUnique({ where: { mobile } });
    if (found) return NextResponse.json({ error: "An account already exists for this mobile number. Please log in to continue." }, { status: 409 });
    const created = await dbPublic.studentUser.create({ data: { name: d.name, mobile, email: d.email.toLowerCase(), passwordHash: await hashPassword(d.password!) } });
    studentId = created.id;
    await issueStudentSession(created);
  }

  const applicationCode = await nextCode(dbPublic, "application");
  const app = await dbPublic.application.create({
    data: {
      applicationCode, studentId, universityId: university.id, programId: program.id, specialization: d.specialization || null, mode: program.mode,
      name: d.name, mobile, email: d.email.toLowerCase(), dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null, city: d.city || null, qualification: d.qualification,
      events: { create: { status: "APPLICATION_RECEIVED", note: "Application created by student", createdBy: "student" } },
    },
    select: { id: true, applicationCode: true },
  });
  return NextResponse.json({ ok: true, id: app.id, applicationCode: app.applicationCode });
}
