import { NextResponse } from "next/server";
import { dbPublic } from "@/lib/db";
import { getStudent } from "@/lib/auth";
import { putFile, validateUpload } from "@/lib/storage";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const TYPES = new Set(["ID", "PHOTO", "QUALIFICATION_CERT", "MARKSHEET", "OTHER"]);

export async function POST(req: Request) {
  const student = await getStudent();
  if (!student) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!rateLimit(`docs:${student.id}`, 20, 60 * 60 * 1000).ok) return NextResponse.json({ error: "Upload limit reached for now." }, { status: 429 });
  const fd = await req.formData();
  const file = fd.get("file");
  const type = String(fd.get("type") ?? "");
  const applicationId = String(fd.get("applicationId") ?? "");
  if (!(file instanceof File) || !TYPES.has(type)) return NextResponse.json({ error: "Choose a document type and a file." }, { status: 400 });
  const bad = validateUpload(file);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  // Ownership check — a student can only attach documents to their own application.
  const app = await dbPublic.application.findFirst({ where: { id: applicationId, studentId: student.id }, select: { id: true } });
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  const key = await putFile(file, `applications/${app.id}`);
  const doc = await dbPublic.document.create({ data: { applicationId: app.id, type, fileName: file.name.slice(0, 120), storageKey: key, mimeType: file.type, sizeBytes: file.size } });
  await dbPublic.application.update({ where: { id: app.id }, data: { status: "DOCUMENTS_UNDER_REVIEW", events: { create: { status: "DOCUMENTS_UNDER_REVIEW", note: `${type} uploaded`, createdBy: "student" } } } });
  return NextResponse.json({ ok: true, id: doc.id });
}
