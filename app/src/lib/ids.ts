import type { PrismaClient } from "@prisma/client";

/** Sequential, year-scoped codes: DC-2026-000001 (applications), DC-L-2026-000001 (leads). */
export async function nextCode(db: PrismaClient, kind: "application" | "lead") {
  const year = new Date().getFullYear();
  const key = `${kind}:${year}`;
  const row = await db.counter.upsert({ where: { key }, update: { value: { increment: 1 } }, create: { key, value: 1 } });
  const n = String(row.value).padStart(6, "0");
  return kind === "application" ? `DC-${year}-${n}` : `DC-L-${year}-${n}`;
}
