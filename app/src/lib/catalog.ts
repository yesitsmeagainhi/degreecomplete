import { Prisma } from "@prisma/client";
import { dbPublic } from "./db";

/**
 * Everything a student-facing page reads goes through this module.
 *  - uses `dbPublic` (DB role without access to schema `internal`)
 *  - selects fields explicitly (no `include` spreads)
 *  - returns only PUBLISHED records
 */

export const publicFeeSelect = {
  id: true, feeCode: true, specialization: true, planType: true, currency: true,
  registrationFee: true, applicationFee: true, admissionFee: true, alumniFee: true, examFee: true, examFeeBasis: true,
  tuitionPerSemester: true, tuitionPerYear: true, tuitionTotal: true,
  semesterPlanFee: true, annualPlanFee: true, fullPlanFee: true, totalProgramFee: true, scholarshipTotalFee: true, discountPct: true,
  installments: true, semesters: true, durationYears: true, notes: true, eligibilityText: true,
  effectiveIntake: true, publishedAt: true, updatedAt: true,
} satisfies Prisma.FeeRecordSelect;

export const publicProgramSelect = {
  id: true, slug: true, course: true, courseDisplay: true, specialization: true, mode: true, level: true,
  durationYears: true, maxDurationYears: true, durationText: true, semesters: true, semestersText: true,
  eligibilityText: true, minMarks: true, selectionText: true, documents: true, totalFeeApprox: true, financingText: true, notes: true,
  overview: true, publishedAt: true, updatedAt: true,
  specializations: { select: { name: true }, orderBy: { name: "asc" } },
  fees: { where: { status: "PUBLISHED" }, select: publicFeeSelect, orderBy: [{ planType: "asc" }, { specialization: "asc" }] },
} satisfies Prisma.ProgramSelect;

export const publicUniversitySelect = {
  id: true, slug: true, name: true, shortName: true, location: true, website: true, description: true, logoUrl: true,
  registrationFeeText: true, examFeeText: true, financingAvailable: true, financingPartners: true, effectiveIntake: true, publishedAt: true, updatedAt: true,
} satisfies Prisma.UniversitySelect;

const publishedUniversity: Prisma.UniversityWhereInput = { status: "ACTIVE", verificationStatus: "PUBLISHED" };
const publishedProgram: Prisma.ProgramWhereInput = { status: "PUBLISHED", university: publishedUniversity };

export type PublicFee = Prisma.FeeRecordGetPayload<{ select: typeof publicFeeSelect }>;
export type PublicProgram = Prisma.ProgramGetPayload<{ select: typeof publicProgramSelect }>;
export type PublicUniversity = Prisma.UniversityGetPayload<{ select: typeof publicUniversitySelect }>;

/** Headline figure for a fee row: what the source calls the total, else the one-time plan, else tuition total. */
export const headlineFee = (f: PublicFee) => f.totalProgramFee ?? f.fullPlanFee ?? f.tuitionTotal ?? null;

/** Lowest headline fee across STANDARD UG/PG rows. Used for "starting from" — only on published rows. */
export function startingFee(programs: { level: string; fees: PublicFee[] }[]) {
  let min: number | null = null;
  for (const p of programs) {
    if (!["UG", "PG"].includes(p.level)) continue;
    for (const f of p.fees) {
      if (f.planType !== "STANDARD") continue;
      const v = headlineFee(f);
      if (v && (min === null || v < min)) min = v;
    }
  }
  return min;
}

export async function catalogueCounts() {
  const [universities, programs, specializations] = await Promise.all([
    dbPublic.university.count({ where: publishedUniversity }),
    dbPublic.program.count({ where: publishedProgram }),
    dbPublic.specialization.count({ where: { program: publishedProgram } }),
  ]);
  return { universities, programs, specializations };
}

/** Lowest headline fee per course (STANDARD plans only). */
function courseFeeMap(programs: { course: string; fees: PublicFee[] }[]) {
  const map: Record<string, number> = {};
  for (const p of programs) {
    for (const f of p.fees) {
      if (f.planType !== "STANDARD") continue;
      const v = headlineFee(f);
      if (v && (!map[p.course] || v < map[p.course])) map[p.course] = v;
    }
  }
  return map;
}

export type UniversityCard = PublicUniversity & {
  modes: string[]; levels: string[]; courses: string[]; programCount: number; startingFee: number | null; courseFees: Record<string, number>;
};

export async function listUniversities(): Promise<UniversityCard[]> {
  const rows = await dbPublic.university.findMany({
    where: publishedUniversity,
    orderBy: { name: "asc" },
    select: {
      ...publicUniversitySelect,
      programs: { where: { status: "PUBLISHED" }, select: { course: true, mode: true, level: true, fees: { where: { status: "PUBLISHED", planType: "STANDARD" }, select: publicFeeSelect } } },
    },
  });
  return rows.map(({ programs, ...u }) => ({
    ...u,
    modes: [...new Set(programs.map((p) => p.mode))].sort(),
    levels: [...new Set(programs.map((p) => p.level))].sort(),
    courses: [...new Set(programs.map((p) => p.course))].sort(),
    programCount: programs.length,
    startingFee: startingFee(programs),
    courseFees: courseFeeMap(programs),
  }));
}

export async function getUniversity(slug: string) {
  const u = await dbPublic.university.findFirst({
    where: { slug, ...publishedUniversity },
    select: {
      ...publicUniversitySelect,
      programs: { where: { status: "PUBLISHED" }, select: publicProgramSelect, orderBy: [{ level: "asc" }, { course: "asc" }] },
      financing: { where: { status: { in: ["VERIFIED", "PUBLISHED"] } }, select: { loanPartners: true, rateOfInterest: true, appliesTo: true, noLoan: true, details: true } },
    },
  });
  return u;
}

export async function getProgram(universitySlug: string, programSlug: string) {
  return dbPublic.program.findFirst({
    where: { slug: programSlug, ...publishedProgram, university: { slug: universitySlug, ...publishedUniversity } },
    select: { ...publicProgramSelect, university: { select: publicUniversitySelect } },
  });
}

export type ProgramHit = Prisma.ProgramGetPayload<{ select: typeof programHitSelect }>;
const programHitSelect = {
  id: true, slug: true, course: true, courseDisplay: true, specialization: true, mode: true, level: true, durationYears: true, minMarks: true, totalFeeApprox: true,
  university: { select: { slug: true, name: true, location: true } },
  specializations: { select: { name: true }, orderBy: { name: "asc" } },
  fees: { where: { status: "PUBLISHED", planType: "STANDARD" }, select: publicFeeSelect },
} satisfies Prisma.ProgramSelect;

export type SearchFilters = {
  q?: string; course?: string; mode?: "ONLINE" | "DISTANCE"; level?: string; university?: string; qualification?: string;
  maxFee?: number; minFee?: number; maxYears?: number; sort?: "fee_asc" | "fee_desc" | "name";
};

/** Levels a student can enter from a given highest qualification. */
export const levelsForQualification: Record<string, string[]> = {
  "12th Pass": ["UG", "Diploma", "Certificate", "Integrated"],
  Diploma: ["UG", "Diploma", "Certificate", "Integrated"],
  Graduation: ["PG", "PG Diploma", "PG Certificate", "Executive", "Doctoral"],
  "Post Graduation": ["PG", "PG Diploma", "PG Certificate", "Executive", "Doctoral"],
  "Working Professional": ["PG", "PG Certificate", "Executive", "Doctoral", "UG", "Diploma"],
};

/** Headline for a program: lowest verified standard fee, else the master's approximate total (flagged approx). */
export function programHeadline(p: { fees: PublicFee[]; totalFeeApprox: number | null }) {
  const v = p.fees.filter((f) => f.planType === "STANDARD").map(headlineFee).filter((x): x is number => !!x).sort((a, b) => a - b)[0];
  if (v) return { fee: v, approx: false };
  if (p.totalFeeApprox) return { fee: p.totalFeeApprox, approx: true };
  return { fee: null, approx: false };
}

export async function searchPrograms(f: SearchFilters): Promise<ProgramHit[]> {
  const q = f.q?.trim();
  const variants = q ? searchVariants(q) : [];
  const where: Prisma.ProgramWhereInput = {
    ...publishedProgram,
    ...(f.course && f.course !== "UG" ? { course: { equals: f.course, mode: "insensitive" } } : {}),
    ...(f.course === "UG" ? { level: "UG" } : {}),
    ...(f.mode ? { mode: f.mode } : {}),
    ...(f.level ? { level: f.level } : {}),
    ...(f.qualification && levelsForQualification[f.qualification] ? { level: { in: levelsForQualification[f.qualification] } } : {}),
    ...(f.university ? { university: { ...publishedUniversity, slug: f.university } } : {}),
    ...(q
      ? {
          OR: [
            ...variants.flatMap((v) => [
              { course: { contains: v, mode: "insensitive" as const } },
              { courseDisplay: { contains: v, mode: "insensitive" as const } },
            ]),
            { university: { name: { contains: q, mode: "insensitive" } } },
            { specializations: { some: { name: { contains: q, mode: "insensitive" } } } },
            ...tokenise(q).flatMap((t) => {
              const tv = searchVariants(t);
              return tv.flatMap((v) => [
                { course: { contains: v, mode: "insensitive" as const } },
                { specializations: { some: { name: { contains: v, mode: "insensitive" as const } } } },
              ]);
            }),
          ],
        }
      : {}),
  };
  const rows = await dbPublic.program.findMany({ where, select: programHitSelect, take: 300 });
  let hits = rows;
  if (f.minFee || f.maxFee || f.maxYears) {
    hits = hits.filter((p) => {
      const fee = programHeadline(p).fee;
      if (f.minFee && (fee === null || fee < f.minFee)) return false;
      if (f.maxFee && (fee === null || fee > f.maxFee)) return false;
      if (f.maxYears && p.durationYears && p.durationYears > f.maxYears) return false;
      return true;
    });
  }
  const feeOf = (p: ProgramHit) => programHeadline(p).fee ?? Number.MAX_SAFE_INTEGER;
  if (f.sort === "fee_asc") hits.sort((a, b) => feeOf(a) - feeOf(b));
  else if (f.sort === "fee_desc") hits.sort((a, b) => feeOf(b) - feeOf(a));
  else hits.sort((a, b) => a.university.name.localeCompare(b.university.name) || a.course.localeCompare(b.course));
  return hits;
}

/** Generate search variants to handle abbreviations like "bcom" → "b.com", "mcom" → "m.com" */
function searchVariants(q: string): string[] {
  const set = new Set<string>([q]);
  // Strip dots: "B.Com" → "BCom"
  const noDots = q.replace(/\./g, "");
  set.add(noDots);
  // Add dot after single leading letter: "bcom" → "b.com", "mcom" → "m.com", "btech" → "b.tech"
  const m = noDots.match(/^([a-zA-Z])(\w+)$/);
  if (m) set.add(`${m[1]}.${m[2]}`);
  return [...set];
}

/** "MBA Finance" → tries "MBA" as course and "Finance" as specialization; "Online BCA" → mode + course. */
function tokenise(q: string) {
  return q.split(/\s+/).filter((t) => t.length > 1 && !["online", "distance", "in", "course", "degree"].includes(t.toLowerCase()));
}

export function parseSearchQuery(q: string): SearchFilters {
  const lower = q.toLowerCase();
  const mode = lower.includes("distance") ? "DISTANCE" : lower.includes("online") ? "ONLINE" : undefined;
  return { q: q.replace(/\b(online|distance)\b/gi, "").trim(), mode };
}

export async function getProgramsByIds(ids: string[]) {
  if (!ids.length) return [];
  return dbPublic.program.findMany({
    where: { id: { in: ids.slice(0, 4) }, ...publishedProgram },
    select: { ...publicProgramSelect, university: { select: publicUniversitySelect } },
  });
}

export const courseFamilies = ["MBA", "BBA", "BCA", "MCA", "BA", "B.Com", "MA", "M.Com", "M.Sc", "Diploma", "PG Diploma", "Certificate"] as const;

export async function courseFamilyCounts() {
  const rows = await dbPublic.program.groupBy({ by: ["course"], where: publishedProgram, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.course, r._count._all])) as Record<string, number>;
}

export async function getDocumentRequirements() {
  return dbPublic.documentRequirement.findMany({ orderBy: { num: "asc" }, select: { num: true, name: true, requiredFor: true, format: true, mandatory: true, remarks: true } });
}
export async function getAdmissionSteps() {
  return dbPublic.admissionStep.findMany({ orderBy: { sortOrder: "asc" }, select: { step: true, action: true, who: true, timeline: true } });
}
export async function getEligibilityRules() {
  return dbPublic.eligibilityRule.findMany({ orderBy: { sortOrder: "asc" }, select: { levelLabel: true, eligibility: true, minMarks: true, duration: true, extra: true, documents: true } });
}
export async function getSiteNotes() {
  const rows = await dbPublic.siteNote.findMany({ select: { key: true, body: true } });
  return Object.fromEntries(rows.map((r) => [r.key, r.body])) as Record<string, string>;
}

export async function getContentPage(slug: string) {
  return dbPublic.contentPage.findFirst({ where: { slug, published: true }, select: { slug: true, title: true, body: true, metaTitle: true, metaDesc: true, updatedAt: true } });
}

export async function listFaqs() {
  return dbPublic.faqItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, select: { question: true, answer: true, category: true } });
}
