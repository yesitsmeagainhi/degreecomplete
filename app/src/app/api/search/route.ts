import { NextResponse } from "next/server";
import { searchPrograms, programHeadline, type SearchFilters } from "@/lib/catalog";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Public search API. Returns only allow-listed public fields. */
export async function GET(req: Request) {
  if (!rateLimit(`search:${clientIp(req)}`, 60, 60 * 1000).ok) return NextResponse.json([], { status: 429 });
  const p = new URL(req.url).searchParams;
  const f: SearchFilters = {
    q: p.get("q") ?? undefined, course: p.get("course") ?? undefined, level: p.get("level") ?? undefined, qualification: p.get("qualification") ?? undefined,
    mode: (p.get("mode") as SearchFilters["mode"]) ?? undefined, maxFee: p.get("maxFee") ? Number(p.get("maxFee")) : undefined,
    sort: (p.get("sort") as SearchFilters["sort"]) ?? undefined,
  };
  const hits = await searchPrograms(f);
  return NextResponse.json(hits.map((h) => ({
    id: h.id, slug: h.slug, course: h.course, courseDisplay: h.courseDisplay, mode: h.mode, level: h.level, durationYears: h.durationYears, minMarks: h.minMarks,
    university: h.university, specializations: h.specializations,
    fee: programHeadline(h).fee, approx: programHeadline(h).approx,
  })), { headers: { "Cache-Control": "public, max-age=60" } });
}
