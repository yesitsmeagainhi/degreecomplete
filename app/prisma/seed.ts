/**
 * Seed the database from the normalized July-2026 dataset.
 *
 *   npm run db:seed                    -> loads everything, every record UNDER_REVIEW (production default)
 *   SEED_PUBLISH_CLEAN=1 npm run db:seed
 *                                      -> STAGING ONLY: additionally marks unflagged, non-conflicting
 *                                         fee rows of ACTIVE universities as VERIFIED+PUBLISHED so the
 *                                         site can be reviewed end-to-end. Never use on production.
 *
 * Internal commercials are read from ../data/internal and written ONLY to the `internal` schema.
 */
import { PrismaClient, RecordStatus, UniversityStatus, Mode, PlanType, FindingSeverity, StaffRole } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DATA = resolve(__dirname, "../../data");
const PUBLISH_CLEAN = process.env.SEED_PUBLISH_CLEAN === "1";

const readJson = (p: string) => JSON.parse(readFileSync(resolve(DATA, p), "utf8"));

const uniStatus: Record<string, UniversityStatus> = {
  active: "ACTIVE", on_hold: "ON_HOLD", not_available: "NOT_AVAILABLE", no_fee_data: "NO_FEE_DATA", no_data: "NO_DATA",
};
const feeStatus: Record<string, RecordStatus> = {
  under_review: "UNDER_REVIEW", conflict: "CONFLICT", missing: "MISSING", on_hold: "ON_HOLD", not_available: "NOT_AVAILABLE",
};
const planType: Record<string, PlanType> = {
  standard: "STANDARD", loan: "LOAN", scholarship: "SCHOLARSHIP", working_professional: "WORKING_PROFESSIONAL", emi: "EMI",
};
const mode = (m: string): Mode => (m.toLowerCase() === "distance" ? "DISTANCE" : "ONLINE");
const programSlug = (course: string, m: string) => `${course.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${m.toLowerCase()}`;

async function main() {
  const universities = readJson("public/universities.json");
  const programs = readJson("public/programs.json");
  const fees = readJson("public/fees.json");
  const financing = readJson("public/financing.json");
  const report = readJson("validation_report.json");

  console.log(`Seeding ${universities.length} universities, ${programs.length} programs, ${fees.length} fee records…`);

  const uniIds = new Map<string, string>();
  for (const u of universities) {
    const row = await prisma.university.upsert({
      where: { slug: u.slug },
      update: {},
      create: {
        slug: u.slug, name: u.name, location: u.location, website: u.website,
        status: uniStatus[u.status] ?? "NO_DATA",
        verificationStatus: "UNDER_REVIEW",
        registrationFeeText: u.registration_fee_text, examFeeText: u.exam_fee_text,
        financingAvailable: u.financing_available, financingPartners: u.financing_partners,
        effectiveIntake: u.effective_intake,
      },
    });
    uniIds.set(u.slug, row.id);
  }

  const programIds = new Map<string, string>();
  for (const p of programs) {
    const universityId = uniIds.get(p.university_slug)!;
    const slug = p.slug ?? programSlug(p.course, p.mode);
    const row = await prisma.program.upsert({
      where: { universityId_slug: { universityId, slug } },
      update: {},
      create: {
        universityId, slug, course: p.course, courseDisplay: p.course_display ?? p.course, specialization: p.specialization ?? null, mode: mode(p.mode), level: p.level,
        durationYears: p.duration_years ?? null, maxDurationYears: p.max_duration_years ?? null, durationText: p.duration_min_text ?? null,
        semesters: p.semesters ?? null, semestersText: p.semesters_text ?? null,
        eligibilityText: p.eligibility ?? null, minMarks: p.min_marks ?? null, selectionText: p.selection ?? null, documents: p.documents ?? [],
        feeSummary: p.fee_summary ?? undefined, totalFeeApprox: p.total_fee_approx ?? null, financingText: p.financing_text ?? null, notes: p.notes ?? null,
        sourceVerification: p.source_verification ?? null, sourceFile: p.source_file ?? null, sourceSheet: p.source_sheet ?? null, sourceRef: p.source_ref ?? null,
        flags: p.flags ?? [], inMasterCatalogue: true, status: "UNDER_REVIEW",
        specializations: { create: [...new Set((p.specializations as string[]))].map((name) => ({ name })) },
      },
    });
    programIds.set(p.id ?? `${p.university_slug}|${p.course}|${p.mode}`, row.id);
  }

  const uniStatusBySlug = new Map<string, string>(universities.map((u: any) => [u.slug, u.status]));
  let published = 0;
  for (const f of fees) {
    const programId = programIds.get(f.program_id ?? `${f.university_slug}|${f.course}|${f.mode}`);
    if (!programId) { console.warn("No program for fee", f.id); continue; }
    let status: RecordStatus = feeStatus[f.status] ?? "UNDER_REVIEW";
    let publishedAt: Date | null = null;
    if (PUBLISH_CLEAN && status === "UNDER_REVIEW" && (f.flags as string[]).length === 0 && uniStatusBySlug.get(f.university_slug) === "active") {
      status = "PUBLISHED"; publishedAt = new Date(); published++;
    }
    await prisma.feeRecord.upsert({
      where: { feeCode: f.id },
      update: {},
      create: {
        feeCode: f.id, programId, specialization: f.specialization, planType: planType[f.plan_type] ?? "STANDARD", currency: f.currency,
        registrationFee: f.registration_fee, applicationFee: f.application_fee, admissionFee: f.admission_fee, alumniFee: f.alumni_fee,
        examFee: f.exam_fee, examFeeBasis: f.exam_fee_basis, tuitionPerSemester: f.tuition_per_semester, tuitionPerYear: f.tuition_per_year,
        tuitionTotal: f.tuition_total, semesterPlanFee: f.semester_plan_fee, annualPlanFee: f.annual_plan_fee, fullPlanFee: f.full_plan_fee,
        totalProgramFee: f.total_program_fee, scholarshipTotalFee: f.scholarship_total_fee, discountPct: f.discount_pct,
        installments: f.installments ?? undefined, semesters: f.semesters, durationYears: f.duration_years, notes: f.notes, eligibilityText: f.eligibility_text,
        sourceFile: f.source_file, sourceSheet: f.source_sheet, sourceRef: f.source_ref, effectiveIntake: f.effective_intake,
        status, flags: f.flags, publishedAt,
      },
    });
  }

  // ---- admission master: eligibility rules, documents checklist, admission steps, site notes ----
  const rules = readJson("public/eligibility_rules.json");
  const docs = readJson("public/documents.json");
  const stepsList = readJson("public/admission_steps.json");
  await prisma.eligibilityRule.deleteMany();
  for (const [i, r] of rules.entries()) await prisma.eligibilityRule.create({ data: { levelLabel: r.level_label, eligibility: r.eligibility, minMarks: r.min_marks, duration: r.duration, extra: r.extra, documents: r.documents ?? [], sortOrder: i } });
  await prisma.documentRequirement.deleteMany();
  for (const d of docs.items) await prisma.documentRequirement.create({ data: { num: d.num, name: d.name, requiredFor: d.required_for, format: d.format, mandatory: d.mandatory, remarks: d.remarks } });
  await prisma.admissionStep.deleteMany();
  for (const [i, st] of stepsList.entries()) await prisma.admissionStep.create({ data: { step: String(st.step), action: st.action, who: st.who, timeline: st.timeline, sortOrder: i } });
  for (const [key, body] of Object.entries({ verification_flow: docs.verification_flow, process_note: docs.process_note, abc_note: docs.abc_note, max_duration_rule: docs.max_duration_rule, reservation_note: docs.reservation_note, disclaimer: docs.disclaimer })) {
    if (body) await prisma.siteNote.upsert({ where: { key }, update: { body: String(body) }, create: { key, body: String(body) } });
  }

  if (PUBLISH_CLEAN) {
    await prisma.program.updateMany({ where: { fees: { some: { status: "PUBLISHED" } } }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await prisma.university.updateMany({ where: { status: "ACTIVE", programs: { some: { status: "PUBLISHED" } } }, data: { verificationStatus: "PUBLISHED", publishedAt: new Date() } });
    console.log(`STAGING: published ${published} clean fee records.`);
  }

  for (const fin of financing) {
    await prisma.financing.create({
      data: {
        universityId: uniIds.get(fin.university_slug)!, loanPartners: fin.loan_partners, rateOfInterest: fin.rate_of_interest,
        appliesTo: fin.applies_to, noLoan: !!fin.no_loan, details: fin.detail_rows ?? undefined,
        sourceFile: fin.source_file, sourceSheet: fin.source_sheet, sourceRef: fin.source_ref,
      },
    });
  }

  for (const x of report.findings) {
    await prisma.dataFinding.create({ data: { severity: x.severity.toUpperCase() as FindingSeverity, category: x.category, message: x.message, sheet: x.sheet ?? null, row: x.row ?? null } });
  }

  // ---- INTERNAL schema (confidential) -------------------------------------------------
  const internalPath = resolve(DATA, "internal/partner_commercials.json");
  if (existsSync(internalPath)) {
    const internal = JSON.parse(readFileSync(internalPath, "utf8"));
    for (const p of internal.partner_payouts) {
      await prisma.partnerCommercial.create({
        data: {
          universityId: uniIds.get(p.university_slug)!, channel: p.channel, partnerShortCode: p.partner_short_code, programScope: p.program_scope,
          payoutShare: p.payout_share, payoutShareIfLoan: p.payout_share_if_loan, workingStatus: p.working_status, effectiveIntake: p.effective_intake,
          sourceFile: p.source_file, sourceRef: p.source_ref,
        },
      });
    }
    for (const c of internal.center_sharing) {
      await prisma.centerSharing.create({
        data: {
          universityId: uniIds.get(c.university_slug)!, mode: c.mode, course: c.course, specialization: c.specialization,
          studentPayYears: c.student_pay_years, centerPayYears: c.center_pay_years, semantics: c.semantics,
          sourceFile: c.source_file, sourceSheet: c.source_sheet, sourceRef: c.source_ref,
        },
      });
    }
    for (const s of internal.subvention) await prisma.subventionNote.create({ data: { sheet: s.sheet, row: s.row, cells: s.cells } });
    for (const n of internal.notes) await prisma.internalNote.create({ data: { body: n } });
    console.log("Internal commercials loaded into schema `internal`.");
  } else {
    console.log("No data/internal file present — skipping commercials (fine for public-only environments).");
  }

  // ---- bootstrap super admin (change password immediately) -----------------------------
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@degreecomplete.in";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";
  await prisma.staffUser.upsert({
    where: { email }, update: {},
    create: { name: "Super Admin", email, passwordHash: await bcrypt.hash(password, 12), role: StaffRole.SUPER_ADMIN },
  });

  // ---- placeholder content pages (clearly marked) --------------------------------------
  const pages: [string, string][] = [
    ["about", "About Us"], ["how-it-works", "How It Works"], ["why-degreecomplete", "Why DegreeComplete"], ["faq", "Frequently Asked Questions"],
    ["contact", "Contact"], ["privacy-policy", "Privacy Policy"], ["terms", "Terms & Conditions"], ["refund-policy", "Refund & Cancellation Policy"], ["disclaimer", "Disclaimer"],
  ];
  for (const [slug, title] of pages) {
    const body = defaultBody(slug);
    const isPlaceholder = !body;
    const fullBody = isPlaceholder
      ? "> **Placeholder — replace before launch.** This page was generated by the seed script so the route exists. Edit it in Admin → Content.\n\nContent pending."
      : body;
    await prisma.contentPage.upsert({
      where: { slug },
      update: { body: fullBody },
      create: { slug, title, published: true, body: fullBody },
    });
  }
  console.log("Done.");
}

function defaultBody(slug: string) {
  switch (slug) {
    case "about":
      return "Mumbai Institute for Online & Distance Learning helps students explore Online and Distance Learning programs from partner universities, compare courses and fees, check eligibility and apply with guidance. DegreeComplete.in is our student-facing platform.\n\nWe are an education guidance and admission-support platform. We are not a university and do not award degrees; degrees are awarded by the university you enrol with.";
    case "how-it-works":
      return [
        "## Your path from enquiry to enrollment",
        "",
        "DegreeComplete.in is the student-facing platform of Mumbai Institute for Online & Distance Learning (MIODL). We guide you through every step — from choosing the right program to completing enrollment — so you never have to figure it out alone.",
        "",
        "### Step 1 — Explore programs",
        "Browse 30+ UGC-entitled universities offering online and distance degrees. Filter by course, mode, duration and fees. Every program page shows verified fee tables, eligibility criteria and specializations.",
        "",
        "### Step 2 — Compare side by side",
        "Shortlist up to four programs and compare fees, duration, specializations and university details on one screen.",
        "",
        "### Step 3 — Check eligibility with an advisor",
        "Talk to an education expert on WhatsApp or phone. Share your qualification and documents — your advisor confirms which programs you qualify for, explains fee plans and answers your questions.",
        "",
        "### Step 4 — Apply and upload documents",
        "Fill in the application form, choose your university and program, and upload soft copies of your documents (scanned PDF/JPG). Your advisor pre-checks everything before it goes to the university.",
        "",
        "### Step 5 — Document verification",
        "The university verifies your documents (typically 2–7 working days). Your advisor keeps you updated at every stage. Once verified, you receive a provisional admission letter and a fee-payment link.",
        "",
        "### Step 6 — Pay fees and get enrolled",
        "Pay the university directly — we never collect fees on behalf of a university. After payment you receive your enrollment number, LMS login and ABC/APAAR Academic Bank of Credits ID.",
        "",
        "### Step 7 — Study and graduate",
        "Access lectures, assignments and exams through the university's learning management system. Our support team stays available throughout your degree for re-registration, exam scheduling and any admin queries.",
        "",
        "---",
        "",
        "**Have questions?** Talk to an education expert — call or WhatsApp 98 33 07 44 76, or use the enquiry button on any page.",
      ].join("\n");
    case "disclaimer":
      return "DegreeComplete.in and Mumbai Institute for Online & Distance Learning are not the official website of any university. Program availability, eligibility and fees are provided for guidance and are subject to change as per the respective university's guidelines. Please confirm current details with our advisor and the university before making any payment. We do not guarantee admission, degree completion, employment, salary or promotion.";
    default:
      return "";
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
