# DegreeComplete.in — platform build (Phase 2)

Student-facing brand of **Mumbai Institute for Online & Distance Learning**. An Online & Distance Education guidance
platform: explore partner-university programs, compare fees, check eligibility, apply, track, get support.

> **Status: phase 2.** Phase 1 (fees, catalogue, CRM, admin, student dashboard) plus the owner's admission master:
> eligibility, minimum marks, selection method, documents required, min/max duration and semesters for every
> program, a 20-item document checklist, level-wise eligibility rules and the 8-step admission process. Type-checked
> and production-built. Nothing in the seed is published; an administrator verifies and publishes records.
>
> **Phase-2 additions:** `data/ingest/normalize_v2.py`, new tables `EligibilityRule`, `DocumentRequirement`,
> `AdmissionStep`, `SiteNote`, richer `Program`, pages `/documents-required`, `/admission-process`, `/eligibility`,
> eligibility-first program pages, qualification-aware search and course finder, refreshed palette (navy / action
> blue / gold / reassurance green) and a conversion-oriented homepage flow. Clickable preview:
> `preview/degreecomplete-preview.html` (rebuild with `python3 preview/build_preview.py`).

```
degreecomplete/
├── DATA_VALIDATION_REPORT.md   pre-launch report generated from the four source files
├── data/
│   ├── ingest/normalize.py     reproducible parser for the source files
│   ├── public/                 universities / programs / fees / financing  (student-safe)
│   ├── internal/               partner_commercials.json  — CONFIDENTIAL, never shipped to the browser
│   └── validation_report.json
├── db/                         roles.sql (restricted DB role), notes
└── app/                        Next.js 14 (App Router, TypeScript, Tailwind) + Prisma + PostgreSQL 16
```

## 1. Data: what was extracted and how

```
python3 data/ingest/normalize.py    --uploads <dir with the source files>   # phase 1: fees (24 per-sheet parsers)
python3 data/ingest/normalize_v2.py --uploads <dir>                         # phase 2: admission master merge
```
Phase 1 reads `JULY_26_FEE_STRCUTURE.xlsx`, `50__FEES_STRUCTURE_MU_OL_AND_ODL__1_.xlsx`, `Partner_Sharing_July_26__1_.pdf`
and the logo grid. Phase 2 reads `MIODL_All_Universities_Admission_Master_July2026.xlsx` (307 course rows, 26 tabs)
and attaches every phase-1 fee record to its course row (fuzzy specialization matching, 0 unattached).

| Output | Count |
|---|---|
| Universities | 33 (28 active, 1 on hold, 1 not available, 2 without fee data, 1 no data) |
| Programs (one per admission-master course row) | 307 — 307 with eligibility + documents, 306 with duration, 210 with verified numeric fees, rest show the master's approximate total |
| Specializations | 643+ |
| Fee records (with file/sheet/row provenance) | 410 — all `under_review`, 49 flagged, 5 conflicts, 8 on hold; all attached to a program |
| Eligibility rules / document items / admission steps | 18 / 20 / 8 |
| Commercial sentences scrubbed from student-facing text | 150 (kept only in `data/internal`) |
| Findings | see `DATA_VALIDATION_REPORT.md` |

Rules the parsers follow: never invent a number; keep source references; record conflicts as findings and flag the
affected rows; write payout/center-sharing/subvention data **only** to `data/internal/`; remove every sentence that
mentions commercial terms from student-facing cells (the master embeds a few); keep the College Vidya contact number
out of everything public. Where the master's total differs from the fee sheet by more than 2 % a finding asks the admin
to pick the student-facing value.

## 2. Running it

```bash
cd app
docker compose up -d db                 # PostgreSQL 16 on :5432
cp .env.example .env                    # set SESSION_SECRET, phone, analytics IDs
npm install
npx prisma db push                      # creates schemas `public` and `internal`
npm run db:seed                         # production default: loads everything, publishes nothing
#   npm run db:seed:staging-publish     # STAGING ONLY: also publishes clean rows so the site can be reviewed
psql "$DATABASE_URL" -f ../db/roles.sql # creates the restricted dc_public role → set DATABASE_URL_PUBLIC
npm run dev                             # http://localhost:3000   admin: /admin/login (seeded super admin)
```

Seeded super admin: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defaults `admin@degreecomplete.in` /
`ChangeMe!2026`). Change it on first login.

## 3. Architecture

* **Two database schemas, two roles.** `public` holds the catalogue and operations; `internal` holds partner
  commercials. `db/roles.sql` creates `dc_public`, which has *no* grants on `internal`. Every student-facing page and
  public API uses `dbPublic` (that role). Admin routes use `dbAdmin` only after `requireStaff()` passes.
* **Allow-list serialization.** `src/lib/catalog.ts` is the only module public pages read from. It uses explicit
  Prisma `select`s and returns only `PUBLISHED` records. No object spreads of DB rows reach the client.
* **Fee lifecycle.** `UNDER_REVIEW → VERIFIED → PUBLISHED → EXPIRED`, plus `CONFLICT / MISSING / ON_HOLD /
  NOT_AVAILABLE` from the import. Editing a fee creates a new `FeeRecord` version (`supersedesId`); the previous
  version is expired, never deleted. Every action is written to `AuditLog`. Public pages show *Last updated* and the
  fee disclaimer on every fee block.
* **Missing data.** Any missing component renders as *Contact us to confirm current details / fee*. Eligibility shows
  generic level guidance until an admin enters verified criteria per program (Admin → Universities and programs).
* **Auth.** Stateless HS256 JWT sessions in httpOnly/SameSite cookies (`dc_staff`, `dc_student`), bcrypt passwords,
  rate-limited login, edge middleware guarding `/admin`, `/student`, `/api/admin`.
* **RBAC.** `src/lib/rbac.ts` maps modules → roles. Super Admin everywhere; Counsellor/Operations on leads,
  applications, documents; Operations on fees and data quality; Finance only on commercials, payments, audit;
  Content Manager on content/FAQs.
* **Security controls.** Zod validation on every input; honeypot on lead forms; per-IP rate limits; same-origin
  check on mutating API calls (CSRF); CSP + HSTS + X-Frame-Options; uploads validated by size, MIME *and* magic
  bytes, stored outside `/public`, streamed only to authenticated staff; `noindex` on private areas.
* **Analytics.** `src/lib/analytics.ts` pushes events to GTM/GA4/Meta Pixel with a key allow-list — commercial
  fields cannot be sent even by mistake. Events: university_viewed, course_viewed, fee_viewed, compare_started,
  compare_completed, eligibility_started, lead_submitted, whatsapp_click, call_click, application_started,
  application_completed.

## 4. Routes

Public: `/`, `/universities`, `/universities/[slug]`, `/programs/[university]/[course]`, `/search`, `/compare`,
`/find-course`, `/apply`, SEO pages `/online-mba /distance-mba /online-bba /online-bca /online-mca /online-ba
/distance-ba /online-bcom /online-ma /online-mcom /online-degree-after-12th`, content pages `/about /how-it-works
/why-degreecomplete /faq /contact /privacy-policy /terms /refund-policy /disclaimer`.
Student: `/student/login`, `/student/dashboard`, `/student/applications/[id]`.
Admin: `/admin` overview, `/leads`, `/applications`, `/fees`, `/universities`, `/content`, `/data-quality`,
`/commercials` (Finance), `/audit`.
APIs: `POST /api/leads`, `POST /api/applications`, `GET /api/search`, `POST /api/student/documents`,
`PATCH /api/admin/fees/:id` (verify | publish | expire | revise), `PATCH /api/admin/leads/:id`, auth routes.

## 5. What is stubbed / needs credentials

| Area | State |
|---|---|
| File storage | Local driver implemented; S3 driver is a one-function swap in `src/lib/storage.ts` |
| Lead notifications | `TODO` in `api/leads` — wire email / WhatsApp Business API / external CRM |
| Student OTP login | Password login implemented; mobile OTP needs an SMS provider |
| Payments / receipts | `PartnerInvoice` model and finance page exist; no payment gateway (students pay universities directly) |
| University logos | `logoUrl` field exists; upload only logos you are licensed to display |
| Rate limiting | In-memory (single instance) — use Redis/Upstash when running more than one node |
| ISR / caching | Pages are dynamic for correctness; switch catalogue pages to `revalidate` once fees are stable |
| Content pages | Seeded as clearly-marked placeholders; write real copy in Admin → Content |

## 6. Before launch

1. Re-verify every fee against the **current** intake — all 410 rows are tagged July-2026.
2. Work through the findings in Admin → Data quality (sheet conflicts, 14 master-vs-sheet fee differences, ADTU
   corrupted sheet, Shoolini fees, VU/SU/DPU code collisions, logo-grid universities with no partner data).
3. Eligibility, documents and duration are imported from your admission master (marked verified 03-Sep-2026);
   spot-check a sample against each university's site before publishing, and edit per program in Admin.
4. Decide which universities you may display logos for and under what wording; keep the "not the official website"
   language everywhere.
5. Replace placeholder content pages; have the disclaimer, refund and privacy pages reviewed.
6. Set `DATABASE_URL_PUBLIC` to the `dc_public` role and confirm `/admin/commercials` returns 403 for non-Finance roles.
7. Set analytics IDs, SESSION_SECRET, and the business phone in `.env`; run `npm run build`.
