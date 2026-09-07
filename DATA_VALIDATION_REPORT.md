# Data Validation Report — DegreeComplete.in (Phase 2)

Generated 2026-09-02. Sources: the four July-2026 partner files **plus** the owner's admission master (`MIODL_All_Universities_Admission_Master_July2026.xlsx`, eligibility / duration / documents). **No record is published by the seed.** Every fee and program starts as `under_review`; an administrator verifies and publishes in the admin panel.

## Counts

| Metric | Value |
|---|---|
| universities total | 33 |
| universities by status | active: 28, no_fee_data: 2, on_hold: 1, not_available: 1, no_data: 1 |
| programs | 307 |
| programs with fee data | 210 |
| programs without fee data | 97 |
| specializations | 700 |
| fee records | 410 |
| fee records by status | under_review: 397, on_hold: 8, conflict: 5 |
| fee records flagged | 49 |
| fee rows by sheet | SMU: 9, MUJ: 9, UU: 12, SHARDA: 8, KUK: 19, LPU: 42, DPU (PUNE): 7, VGU: 12, DPU (NAVI MUMBAI ): 8, GLA  : 5, UPES : 39, AMRITA: 21, ANDHRA : 3, NMIMS: 5, PARUL : 30, GALGOTIAS: 7, AMITY : 74, CHANDIGARH UNI.: 15, BENNETT: 2, ALLIANCE : 3, VIT: 3, ADTU: 4, CRIST: 7, DBA: 6, OL FEES : 23, ODL FEES : 16, UG DIPLOMA: 7, PG DIPLOMA: 14 |
| findings | 60 |
| findings by severity | info: 42, warning: 16, error: 2 |
| programs with eligibility | 307 |
| programs with documents | 307 |
| programs with duration | 306 |
| fee records unattached | 0 |
| eligibility rules | 18 |
| document checklist items | 20 |
| admission steps | 8 |
| commercial sentences scrubbed | 150 |

## Universities

| University | Status | Modes | Programs | Fee rows | Starting fee (unverified) |
|---|---|---|---|---|---|
| Uttaranchal University | active | Online | 6 | 12 | ₹72,000 |
| Chandigarh University | active | Online | 15 | 15 | ₹75,000 |
| Sikkim Manipal University | active | Online | 9 | 9 | ₹75,000 |
| Manipal University Jaipur | active | Online | 9 | 9 | ₹80,000 |
| Lovely Professional University | active | Online | 14 | 42 | ₹80,000 |
| University of Petroleum and Energy Studies (UPES) | active | Online | 39 | 39 | ₹150,000 |
| Dr. D. Y. Patil Vidyapeeth, Pune | active | Online | 6 | 7 | ₹140,000 |
| Vellore Institute of Technology (VIT) | active | Online | 3 | 3 | ₹160,000 |
| Bennett University | active | Online | 2 | 2 | ₹150,000 |
| GLA University | active | Online | 5 | 5 | ₹60,000 |
| Amity University Online | active | Online | 37 | 74 | ₹90,000 |
| Amrita Vishwa Vidyapeetham | active | Online | 20 | 21 | — |
| Shoolini University | no_fee_data | Online | 8 | 0 | — |
| Kurukshetra University | active | Online | 19 | 19 | ₹60,000 |
| Andhra University | active | Online | 3 | 3 | ₹57,500 |
| Sharda University | on_hold | Online | 7 | 8 | — |
| Vivekananda Global University | active | Online | 7 | 12 | ₹61,200 |
| D. Y. Patil University, Navi Mumbai | active | Online | 8 | 8 | ₹130,000 |
| Parul University | active | Online | 10 | 30 | ₹40,000 |
| NMIMS (Deemed-to-be University) | active | Online | 7 | 5 | ₹94,000 |
| Galgotias University | active | Online | 7 | 7 | ₹50,200 |
| SRM University | not_available | Online | 0 | 0 | — |
| O.P. Jindal Global University (via upGrad) | no_data | Online | 1 | 0 | — |
| Assam down town University | no_fee_data | Online | 4 | 4 | — |
| Alliance University | active | Online | 3 | 3 | ₹90,000 |
| CHRIST (Deemed to be University) | active | Online | 7 | 7 | ₹75,000 |
| Mangalayatan University | active | Online | 45 | 60 | ₹22,000 |
| Golden Gate University, San Francisco (DBA via upGrad) | active | Online | 1 | 1 | — |
| Rushford Business School (DBA via upGrad) | active | Online | 1 | 1 | — |
| Swiss School of Business and Management (Executive DBA via upGrad) | active | Online | 1 | 1 | — |
| ESGCI Paris (DBA via upGrad) | active | Online | 1 | 1 | — |
| European Institute of Technology & Management (EIMT) — DBA | active | Online | 1 | 1 | — |
| Birchwood University — DBA | active | Online | 1 | 1 | — |

## Findings requiring action

### ERROR (2)

- **missing** — SHOOLINI sheet is empty — partner is 'working' but no fee data exists. All Shoolini programs must show 'Contact us to confirm current fee'. _(sheet: SHOOLINI)_
- **cycle** — Every record is tagged effective_intake=2026-07 (July 2026 intake). Today is 2026-09-02. Verify each fee against the current admission cycle before publishing.

### WARNING (16)

- **unmapped_university** — LOAN STRUCTURE row 1: cannot map 'UNIVERSITY' _(sheet: LOAN STRUCTURE, row 1)_
- **conflict** — Alliance MBA: exam fee 5000/yr in ALLIANCE sheet vs 3000.0 in UNIVERSITY sheet _(sheet: ALLIANCE, row 5)_
- **missing** — eimt: listed in DBA sheet with strategic partner 'CV' but has no line in the partner annexure — commercial terms unknown. _(sheet: DBA)_
- **missing** — birchwood-university: listed in DBA sheet with strategic partner 'CV' but has no line in the partner annexure — commercial terms unknown. _(sheet: DBA)_
- **code_collision** — 'VU' = Bennett University in the partner annexure, but 'VU' = Vignan's in the logo grid.
- **code_collision** — 'SU' = Shoolini in the partner annexure, but 'SU' = Sharda in the JULY 26 workbook (Shoolini is 'SCODE' there).
- **code_collision** — 'DPU' is used for both D.Y. Patil Pune (partner annexure) and D.Y. Patil Navi Mumbai (UNIVERSITY sheet).
- **conflict** — amrita-vishwa-vidyapeetham: registration fee 500 in UNIVERSITY sheet vs [700] in university sheet _(sheet: UNIVERSITY)_
- **conflict** — Sharda: exam fee '3500/yr' (UNIVERSITY sheet) vs 7000 (SHARDA sheet, basis unstated). Partner is ON HOLD anyway. _(sheet: SHARDA)_
- **conflict** — Amrita: registration 500 / exam 2500-per-sem (UNIVERSITY sheet) vs registration 700 / exam 2750 (AMRITA sheet footer). _(sheet: AMRITA)_
- **conflict** — Parul: loan 'YES (Fibe)' in UNIVERSITY sheet vs 'NO LOAN APPLICABLE' in LOAN STRUCTURE sheet. _(sheet: LOAN STRUCTURE)_
- **conflict** — DPU Pune: exam fee '24200' in UNIVERSITY sheet has no basis and does not appear in the DPU (PUNE) sheet. _(sheet: UNIVERSITY)_
- **logo_without_data** — Jain University (JU): appears in the logo grid but has no partner line and no fee sheet. Do not display.
- **logo_without_data** — Manipal Academy of Higher Education (MAHE): appears in the logo grid but has no partner line and no fee sheet. Do not display.
- **logo_without_data** — Vignan's (VU): appears in the logo grid but has no partner line and no fee sheet. Do not display.
- **logo_without_data** — Subharti (SVSU, Distance): appears in the logo grid but has no partner line and no fee sheet. Do not display.

### INFO (42)

- **duplicate** — ALL IN ONE: duplicate program row for vivekananda-global-university / MA / English _(sheet: ALL IN ONE, row 191)_
- **duplicate** — ALL IN ONE: duplicate program row for chandigarh-university / BBA / International Business _(sheet: ALL IN ONE, row 402)_
- **duplicate** — ALL IN ONE: duplicate program row for vivekananda-global-university / BA / International Relation _(sheet: ALL IN ONE, row 421)_
- **duplicate** — VGU sheet row 9: 'MA' listed twice _(sheet: VGU, row 9)_
- **duplicate** — PARUL sheet row 33: duplicate 'MBA / Management Marketing' _(sheet: PARUL, row 33)_
- **naming** — Partner annexure says 'Dy Patil University Mumbai'; fee sheet and website say Navi Mumbai. Stored as D. Y. Patil University, Navi Mumbai.
- **naming** — Partner annexure says 'Manipal University' for MUJ; the fee sheet is titled Manipal University Online (Jaipur).
- **catalogue_gap** — gla-university / B.Com (Hons) (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — amity-university / B.Com (Hons) (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — amity-university / BBA+MBA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — amity-university / B.Com+MBA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — amity-university / BCA+MCA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — amity-university / Certificate (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — vit / MBA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — vit / M.Sc (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — vit / MCA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — assam-down-town-university / BBA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — assam-down-town-university / MBA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — assam-down-town-university / BCA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — assam-down-town-university / MCA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — christ-university / B.Com (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — christ-university / BCA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — christ-university / MCA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — christ-university / MA (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **catalogue_gap** — christ-university / M.Sc (Online) has a fee sheet entry but no row in the ALL IN ONE master catalogue.
- **scope** — ALL IN ONE master catalogue is 100% 'Online'. Distance-mode programs exist only in the Mangalayatan ODL sheet.
- **fee_crosscheck** — kurukshetra-university / Diploma in Bhagavad Gita (1 yr): master total 21899 vs fee-sheet headline 32848 — admin to pick the student-facing value _(sheet: KUK)_
- **fee_crosscheck** — kurukshetra-university / Certificate – Internet of Things (6 m): master total 27374 vs fee-sheet headline 21899 — admin to pick the student-facing value _(sheet: KUK)_
- **fee_crosscheck** — vivekananda-global-university / BA: master total 72000 vs fee-sheet headline 61200 — admin to pick the student-facing value _(sheet: VGU)_
- **fee_crosscheck** — vivekananda-global-university / BBA: master total 132000 vs fee-sheet headline 112200 — admin to pick the student-facing value _(sheet: VGU)_
- **fee_crosscheck** — vivekananda-global-university / BCA: master total 132000 vs fee-sheet headline 112200 — admin to pick the student-facing value _(sheet: VGU)_
- **fee_crosscheck** — vivekananda-global-university / MA: master total 72000 vs fee-sheet headline 61200 — admin to pick the student-facing value _(sheet: VGU)_
- **fee_crosscheck** — vivekananda-global-university / MBA: master total 150000 vs fee-sheet headline 127500 — admin to pick the student-facing value _(sheet: VGU)_
- **fee_crosscheck** — vivekananda-global-university / MCA: master total 150000 vs fee-sheet headline 127500 — admin to pick the student-facing value _(sheet: VGU)_
- **fee_crosscheck** — nmims / BBA: master total 150000 vs fee-sheet headline 131000 — admin to pick the student-facing value _(sheet: NMIMS)_
- **fee_crosscheck** — nmims / B.Com: master total 108000 vs fee-sheet headline 94000 — admin to pick the student-facing value _(sheet: NMIMS)_
- **fee_crosscheck** — nmims / MBA (Online): master total 220000 vs fee-sheet headline 196000 — admin to pick the student-facing value _(sheet: NMIMS)_
- **fee_crosscheck** — mangalayatan-university / BA: master total 40000 vs fee-sheet headline 34000 — admin to pick the student-facing value _(sheet: MANGALAYATAN)_
- **fee_crosscheck** — mangalayatan-university / MBA: master total 67000 vs fee-sheet headline 63000 — admin to pick the student-facing value _(sheet: MANGALAYATAN)_
- **fee_crosscheck** — mangalayatan-university / Diploma in Business Administration [UG Diploma]: master total 19000 vs fee-sheet headline 15000 — admin to pick the student-facing value _(sheet: MANGALAYATAN)_
- **scrubbed_commercial_text** — 150 sentences mentioning commercial terms were removed from student-facing text (12 sheets). The removed text is kept only in data/internal (scrub_log) and is visible to Finance in the real app.
- **source** — Admission master workbook: 307 course rows across 26 tabs; eligibility/duration/documents marked by the owner as verified 03-Sep-2026 from university websites — publish-time re-check still recommended.

## Programs flagged

| Program | Flags |
|---|---|
| kurukshetra-university / Diploma in Bhagavad Gita (1 yr) (Online) | master_total_differs_from_fee_sheet |
| kurukshetra-university / Certificate – Internet of Things (6 m) (Online) | master_total_differs_from_fee_sheet |
| vivekananda-global-university / BA (Online) | master_total_differs_from_fee_sheet |
| vivekananda-global-university / BBA (Online) | master_total_differs_from_fee_sheet |
| vivekananda-global-university / BCA (Online) | master_total_differs_from_fee_sheet |
| vivekananda-global-university / MA (Online) | master_total_differs_from_fee_sheet |
| vivekananda-global-university / MBA (Online) | master_total_differs_from_fee_sheet |
| vivekananda-global-university / MCA (Online) | master_total_differs_from_fee_sheet |
| nmims / BBA (Online) | master_total_differs_from_fee_sheet |
| nmims / B.Com (Online) | master_total_differs_from_fee_sheet |
| nmims / MBA (Online) (Online) | master_total_differs_from_fee_sheet |
| mangalayatan-university / BA (Online) | master_total_differs_from_fee_sheet |
| mangalayatan-university / MBA (Online) | master_total_differs_from_fee_sheet |
| mangalayatan-university / Diploma in Business Administration [UG Diploma] (Online) | master_total_differs_from_fee_sheet |

## Rules applied

- Numeric fees come only from the partner fee sheets (phase 1) with row-level provenance; the master's fee text is stored as `fee_summary` for cross-checking and any >2% difference is a finding.
- Eligibility, minimum marks, selection, documents, duration and notes come from the admission master; the owner states they were verified from university websites on 03-Sep-2026.
- Every sentence mentioning payout / partner share / centre share / subvention was removed from student-facing text and logged in `data/internal/`.
- Nothing is invented; missing cells stay empty and the UI shows *Contact us to confirm current details*.
