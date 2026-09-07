import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db";
import { requireStaffApi } from "@/lib/rbac";
import { getFile } from "@/lib/storage";

/** Streams a stored document to authenticated staff only. Files are never served from /public. */
export async function GET(_req: Request, { params: paramsPromise }: { params: Promise<{ id: string; docId: string }> }) {
  const params = await paramsPromise;
  const staff = await requireStaffApi("admin.documents");
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const d = await dbAdmin.document.findFirst({ where: { id: params.docId, applicationId: params.id } });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buf = await getFile(d.storageKey);
  return new NextResponse(buf, { headers: { "Content-Type": d.mimeType, "Content-Disposition": `inline; filename="${d.fileName.replace(/"/g, "")}"`, "Cache-Control": "private, no-store" } });
}
