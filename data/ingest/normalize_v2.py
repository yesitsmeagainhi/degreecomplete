#!/usr/bin/env python3
"""
Phase 2 — merge MIODL_All_Universities_Admission_Master_July2026.xlsx (eligibility, duration,
documents, selection, notes, fee summary text) with the phase-1 fee records.

Run AFTER normalize.py:
    python3 data/ingest/normalize.py --uploads <dir>
    python3 data/ingest/normalize_v2.py --uploads <dir>

Writes:
    data/public/programs.json        (replaced: one program per master course row, 307 rows)
    data/public/fees.json            (phase-1 records re-attached to the new program ids)
    data/public/eligibility_rules.json, documents.json, admission_steps.json
    data/public/universities.json    (enriched with master-summary contact/fee text; status kept)
    data/internal/partner_commercials.json (master payout column + scrubbed sentences appended)
    data/validation_report.json + DATA_VALIDATION_REPORT.md (regenerated)

Rules: nothing invented; any sentence in a student-facing cell that mentions payout / partner share /
centre share is removed and logged; numeric fees still come from the phase-1 fee sheets and the
master's fee text is kept only as `fee_summary` for admin cross-checking.
"""
from __future__ import annotations
import argparse, json, re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from openpyxl import load_workbook

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from normalize import uni, course as canon_course, split_course, nice_spec, money, txt, LEVEL_BY_COURSE, INTAKE  # noqa

MASTER = "MIODL_All_Universities_Admission_Master_July2026.xlsx"
TAB_TO_SLUG = {
    "MUJ": "manipal-university-jaipur", "SMU": "sikkim-manipal-university", "AMITY": "amity-university", "CUOL": "chandigarh-university",
    "UU": "uttaranchal-university", "LPU": "lovely-professional-university", "UPES": "upes", "DPU PUNE": "dy-patil-university-pune",
    "DPU NAVI MUMBAI": "dy-patil-university-navi-mumbai", "VIT": "vit", "BENNETT": "bennett-university", "GLA": "gla-university",
    "AMRITA": "amrita-vishwa-vidyapeetham", "SHOOLINI": "shoolini-university", "KUK": "kurukshetra-university", "ANDHRA": "andhra-university",
    "SHARDA": "sharda-university", "VGU": "vivekananda-global-university", "PARUL": "parul-university", "NMIMS": "nmims",
    "GALGOTIAS": "galgotias-university", "ADTU": "assam-down-town-university", "ALLIANCE": "alliance-university", "CHRIST": "christ-university",
    "MANGALAYATAN": "mangalayatan-university",
}
DBA_ROW_TO_SLUG = {"Golden Gate": "golden-gate-university", "Rushford": "rushford-business-school", "SSBM": "ssbm-geneva", "ESGCI": "esgci-paris",
                   "EIMT": "eimt", "Birchwood": "birchwood-university", "OP Jindal": "op-jindal-global-university"}
LEVEL_MAP = {"UG": "UG", "PG": "PG", "Integrated": "Integrated", "Certificate": "Certificate", "Executive": "Executive", "Diploma": "Diploma",
             "PG Certificate": "PG Certificate", "Doctorate": "Doctoral", "Bachelor (1-yr)": "UG", "Master (1-yr)": "PG", "Diploma (UG)": "Diploma", "Diploma (PG)": "PG Diploma"}
CONFIDENTIAL = re.compile(r"(payout|partner share|centre share|center share|subvention|commission)", re.I)


def scrub(text: str | None, log: list, where: str) -> str | None:
    """Remove any sentence that mentions commercial terms from a student-facing cell."""
    if not text:
        return None
    parts = re.split(r"(?<=[.;])\s+|\s*\|\s*", str(text))
    keep, dropped = [], []
    for p in parts:
        (dropped if CONFIDENTIAL.search(p) else keep).append(p.strip())
    if dropped:
        log.append(dict(where=where, removed=dropped))
    out = " ".join(x for x in keep if x).strip()
    return out or None


def years(s: str | None):
    if not s:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)\s*(Year|Yr|Month)", str(s), re.I)
    if not m:
        return None
    v = float(m.group(1))
    return round(v / 12, 2) if m.group(2).lower().startswith("m") else v


STOP = {"mba", "bba", "bca", "mca", "ma", "ba", "management", "mgmt", "in", "and", "of", "the", "with", "general", "specialization", "programme", "program", "online", "b", "com", "m", "sc"}


ALIAS_TOK = {"intl": "international", "fin": "finance", "mktg": "marketing", "fm": "financial", "datascience": "data science", "gen": "general", "hrm": "human resource", "ops": "operations", "biz": "business"}


def toks(s: str | None) -> set[str]:
    out = set()
    for w in re.split(r"[^a-z0-9]+", (s or "").lower()):
        w = ALIAS_TOK.get(w, w)
        for part in w.split(" "):
            part = re.sub(r"(ies)$", "y", part)
            part = re.sub(r"s$", "", part) if len(part) > 4 else part
            if part and part not in STOP and len(part) > 1:
                out.add(part)
    return out


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def docs_list(text: str | None) -> list[str]:
    if not text:
        return []
    items = re.split(r"\s*\d{1,2}\)\s*", str(text))
    return [re.sub(r"\s+", " ", i).strip(" .") for i in items if i and i.strip()]


def parse_master_course(name: str, mode_hint: str | None):
    """'MBA – Power Management' -> ('MBA', 'Power Management'); 'BBA [Online]' -> ('BBA', None, 'Online')."""
    n = re.sub(r"\s+", " ", name).strip()
    mode = mode_hint or "Online"
    n = re.sub(r"\((General|Online)[^)]*\)", "", n).strip()
    if " / " in n and not n.lower().startswith("op jindal"):
        n = n.split(" / ")[0].strip()
    if "(Integrated)" in n or re.search(r"\b(BBA|B\.Com|BCA)\s*\+\s*(MBA|MCA)", n):
        m2 = re.search(r"(BBA|B\.Com|BCA)\s*\+\s*(MBA|MCA)", n)
        if m2:
            return f"{canon_course(m2.group(1))}+{m2.group(2)}", None, mode
    if n.lower().startswith("op jindal"):
        return "MBA Executive", "Online MBA / Executive programmes (via upGrad)", mode
    if re.match(r"^MBA\s*\(WX\)", n, re.I):
        return "MBA (WX)", None, mode
    m = re.search(r"\[(Online|Distance)\]", n, re.I)
    if m:
        mode = m.group(1).title()
        n = n.replace(m.group(0), "").strip()
    base = re.split(r"\s+[–-]\s+", n, maxsplit=1)
    head = base[0].strip()
    spec = base[1].strip() if len(base) > 1 else None
    head_clean = re.sub(r"\((Dual|Super|Online|WX|\d+ specializations|3-Year)[^)]*\)", "", head, flags=re.I).strip()
    head_clean = re.sub(r"^(Certificate|Diploma|PG Diploma|PG Certificate|PG Program)\b.*", lambda mm: mm.group(1), head_clean, flags=re.I) if re.match(r"^(Certificate|Diploma|PG Diploma|PG Certificate|PG Program)\b", head_clean, re.I) else head_clean
    c = canon_course(head_clean)
    if c not in LEVEL_BY_COURSE and canon_course(re.sub(r"\(.*?\)", "", head_clean).strip()) in LEVEL_BY_COURSE:
        c = canon_course(re.sub(r"\(.*?\)", "", head_clean).strip())
    if c not in LEVEL_BY_COURSE:
        c2, s2 = split_course(head_clean)
        if c2 in LEVEL_BY_COURSE:
            c, spec = c2, spec or s2
    if head.upper().startswith("MBA (WX)") or "WX" in head.upper():
        c = "MBA (WX)"
    if head.upper().startswith("MBA EXECUTIVE"):
        c = "MBA Executive"
    if re.match(r"^(DCA|PGDCA|PGDJMC|PGDBM)\b", head):
        c = head.split(" ")[0].upper()
    if re.match(r"^(B\.?Lib|M\.?Lib)", head, re.I):
        c = "B.Lib" if head.upper().startswith("B") else "M.Lib"
    if "DBA" in head and "Diploma" not in head:
        c = "Executive DBA" if head.lower().startswith("executive") else "DBA"
    return c, (nice_spec(spec) if spec else None), mode


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--uploads", default="/mnt/user-data/uploads")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parents[1]))
    a = ap.parse_args()
    up, out = Path(a.uploads), Path(a.out)
    pub, internal = out / "public", out / "internal"
    unis = json.loads((pub / "universities.json").read_text())
    fees = json.loads((pub / "fees.json").read_text())
    old_programs = json.loads((pub / "programs.json").read_text())
    rep = json.loads((out / "validation_report.json").read_text())
    internal_data = json.loads((internal / "partner_commercials.json").read_text())
    findings = rep["findings"]
    scrub_log: list = []

    wb = load_workbook(up / MASTER, read_only=True, data_only=True)

    # ---- global sheets -----------------------------------------------------------------
    rules = []
    for r in list(wb["Common Eligibility Rules"].iter_rows(values_only=True))[4:]:
        if not r[0]:
            continue
        rules.append(dict(level_label=txt(r[0]), eligibility=txt(r[1]), min_marks=txt(r[2]), duration=txt(r[3]), extra=txt(r[4]), documents=docs_list(txt(r[5])),
                          source_file=MASTER, source_sheet="Common Eligibility Rules"))
    documents = []
    verification_flow = None
    for r in list(wb["Documents Checklist"].iter_rows(values_only=True))[4:]:
        if isinstance(r[0], (int, float)) and r[1]:
            documents.append(dict(num=int(r[0]), name=txt(r[1]), required_for=txt(r[2]), format=txt(r[3]), mandatory=txt(r[4]), remarks=txt(r[5])))
        elif r[0] and "Step 1" in str(r[0]):
            verification_flow = txt(r[0])
    steps = []
    for r in list(wb["Admission Process"].iter_rows(values_only=True))[4:]:
        if r[0] and r[1]:
            step = txt(r[0])
            action = scrub(txt(r[1]), scrub_log, f"Admission Process step {step}")
            if step == "7" or (action and "invoic" in action.lower()):
                internal_data["notes"].append(f"Admission Process step 7 (partner invoicing cycle): {txt(r[1])}")
                continue
            steps.append(dict(step=step, action=action, who=scrub(txt(r[2]), scrub_log, f"Admission Process step {step} who"), timeline=scrub(txt(r[3]), scrub_log, f"Admission Process step {step} timeline")))
    readme = {}
    for r in list(wb["README"].iter_rows(values_only=True))[3:]:
        if r[0] and r[1]:
            readme[txt(r[0])] = txt(r[1])

    # ---- master summary (university-level) ---------------------------------------------
    summary = {}
    for r in list(wb["Master Summary"].iter_rows(values_only=True))[4:]:
        if not r[1]:
            continue
        tab = txt(r[1])
        slug = TAB_TO_SLUG.get(tab) or ("op-jindal-global-university" if "UPGRAD" in tab.upper() else None)
        if not slug:
            continue
        summary[slug] = dict(name_master=txt(r[3]), location=txt(r[4]), website=txt(r[5]), mode=txt(r[6]), registration_fee_text=txt(r[7]), exam_fee_text=txt(r[8]),
                             loan_available=(txt(r[9]) or "").upper().startswith("Y"), loan_partners=txt(r[10]), partner_status=txt(r[13]))
        internal_data["partner_payouts"].append(dict(channel="Master Summary (owner workbook)", partner_short_code=txt(r[2]), university_slug=slug, program_scope="all programs",
                                                     payout_share=txt(r[11]), payout_share_if_loan=txt(r[12]), working_status=txt(r[13]), effective_intake=INTAKE, source_file=MASTER, source_ref=f"Master Summary row {r[0]}"))
    for u in unis:
        s = summary.get(u["slug"])
        if not s:
            continue
        u["location"] = s["location"] or u["location"]
        u["website"] = s["website"] or u["website"]
        u["registration_fee_text"] = s["registration_fee_text"] or u["registration_fee_text"]
        u["exam_fee_text"] = s["exam_fee_text"] or u["exam_fee_text"]
        if s["loan_partners"]:
            u["financing_partners"] = scrub(s["loan_partners"], scrub_log, f"Master Summary loan partners {u['slug']}")
            u["financing_available"] = s["loan_available"]

    # ---- per-university tabs -------------------------------------------------------------
    programs = []
    seen_slugs: Counter = Counter()
    for tab in wb.sheetnames:
        if tab in {"README", "Master Summary", "Common Eligibility Rules", "Documents Checklist", "Admission Process"}:
            continue
        rows = list(wb[tab].iter_rows(values_only=True))
        for r in rows[5:]:
            if r[0] is None or not r[2]:
                continue
            r = (list(r) + [None] * 22)[:22]
            name = txt(r[2])
            if tab == "UPGRAD DBA":
                slug = next((v for k, v in DBA_ROW_TO_SLUG.items() if k.lower() in name.lower()), None)
                if not slug:
                    findings.append(dict(severity="warning", category="unmapped_university", message=f"UPGRAD DBA row '{name}' not mapped", sheet=tab))
                    continue
            else:
                slug = TAB_TO_SLUG[tab]
            c, spec, mode = parse_master_course(name, None)
            display = re.sub(r"\s*\[(Online|Distance)\]", "", name).strip()
            level = LEVEL_MAP.get(txt(r[1]) or "", LEVEL_BY_COURSE.get(c, "Other"))
            specs = [nice_spec(x) for x in re.split(r"\s*\|\s*", txt(r[3]) or "") if x and x.strip()]
            specs = [x for x in specs if x and x.lower() not in {"–", "-"}]
            where = f"{tab} row S.No {r[0]}"
            fee_summary = dict(registration=txt(r[11]), exam=txt(r[12]), semester=txt(r[13]), annual=txt(r[14]), full=txt(r[15]), total=txt(r[16]))
            total_approx = money(re.search(r"₹\s?[\d,]+", txt(r[16]) or "").group(0)) if re.search(r"₹\s?[\d,]+", txt(r[16]) or "") else None
            pslug = slugify(display) + "-" + mode.lower()
            seen_slugs[(slug, pslug)] += 1
            if seen_slugs[(slug, pslug)] > 1:
                pslug += f"-{seen_slugs[(slug, pslug)]}"
            programs.append(dict(
                id=f"{slug}|{pslug}", university_slug=slug, slug=pslug, course=c, course_display=display, specialization=spec, mode=mode, level=level,
                specializations=specs, duration_min_text=txt(r[4]), duration_max_text=txt(r[5]), duration_years=years(txt(r[4])), max_duration_years=years(txt(r[5])),
                semesters_text=txt(r[6]), semesters=int(r[6]) if isinstance(r[6], (int, float)) else None,
                eligibility=scrub(txt(r[7]), scrub_log, where + " eligibility"), min_marks=txt(r[8]), selection=txt(r[9]),
                documents=docs_list(txt(r[10])), fee_summary=fee_summary, total_fee_approx=total_approx,
                financing_text=scrub(txt(r[17]), scrub_log, where + " loan text"), notes=scrub(txt(r[19]), scrub_log, where + " notes"),
                source_verification=txt(r[20]), source_file=MASTER, source_sheet=tab, source_ref=f"S.No {r[0]}", effective_intake=INTAKE,
                status="under_review", fee_ids=[], flags=[],
            ))
            if txt(r[18]):
                internal_data["notes"].append(f"{where}: partner payout column = {txt(r[18])}")

    # ---- attach phase-1 fee records --------------------------------------------------------
    by_uni = defaultdict(list)
    for p in programs:
        by_uni[p["university_slug"]].append(p)
    unattached = 0
    for f in fees:
        cands = [p for p in by_uni[f["university_slug"]] if p["course"] == f["course"] and p["mode"] == f["mode"]]
        if not cands:
            cands = [p for p in by_uni[f["university_slug"]] if p["course"] == f["course"]]
        if not cands and f["course"] in {"Diploma", "Certificate", "PG Diploma", "PG Certificate"}:
            cands = [p for p in by_uni[f["university_slug"]] if p["level"] in {"Diploma", "Certificate", "PG Diploma", "PG Certificate"} and (f["course_display"] or "").lower()[:12] in (p["course_display"] or "").lower()]
        target = None
        if f.get("specialization"):
            fs = toks(f["specialization"])
            best, score = None, 0.0
            for p in cands:
                for cand_spec in ([p["specialization"]] if p["specialization"] else []) + p["specializations"]:
                    ps = toks(cand_spec)
                    if not fs or not ps:
                        continue
                    sc = len(fs & ps) / min(len(fs), len(ps))
                    if p["specialization"] and cand_spec == p["specialization"]:
                        sc += 0.01  # prefer a dedicated variant row over a specialization listed inside a general row
                    if sc > score:
                        best, score = p, sc
            if score >= 0.5:
                target = best
            elif not fs:  # "General" style specialization → the general/first variant row
                target = next((p for p in cands if not p["specialization"] or "general" in p["specialization"].lower()), None)
        if not target:
            general = [p for p in cands if not p["specialization"]]
            if general:
                target = general[0]
            elif cands and not f.get("specialization"):
                target = cands[0]
        if target:
            target["fee_ids"].append(f["id"]); f["program_id"] = target["id"]
        else:
            unattached += 1; f["program_id"] = None
            findings.append(dict(severity="warning", category="fee_unattached", message=f"Fee {f['id']} ({f['university_slug']} {f['course_display']} {f['mode']}) has no matching course row in the admission master", sheet=f["source_sheet"]))
    # cross-check master total vs sheet headline
    for p in programs:
        std = [x for x in fees if x["id"] in p["fee_ids"] and x["plan_type"] == "standard" and x["status"] == "under_review" and not x["flags"]]
        heads = [x["total_program_fee"] or x["full_plan_fee"] or x["tuition_total"] for x in std]
        heads = [h for h in heads if h]
        p["has_fee_data"] = bool(heads)
        if heads and p["total_fee_approx"] and abs(min(heads) - p["total_fee_approx"]) / max(p["total_fee_approx"], 1) > 0.02:
            p["flags"].append("master_total_differs_from_fee_sheet")
            findings.append(dict(severity="info", category="fee_crosscheck", message=f"{p['university_slug']} / {p['course_display']}: master total {p['total_fee_approx']} vs fee-sheet headline {min(heads)} — admin to pick the student-facing value", sheet=p["source_sheet"]))
        if not p["eligibility"]:
            p["flags"].append("no_eligibility_text")
        if not p["documents"]:
            p["flags"].append("no_documents_list")
    if scrub_log:
        findings.append(dict(severity="info", category="scrubbed_commercial_text", message=f"{len(scrub_log)} sentences mentioning commercial terms were removed from student-facing text ({len({e['where'].split(' row')[0] for e in scrub_log})} sheets). The removed text is kept only in data/internal (scrub_log) and is visible to Finance in the real app."))
    findings.append(dict(severity="info", category="source", message=f"Admission master workbook: {len(programs)} course rows across {len(TAB_TO_SLUG)+1} tabs; eligibility/duration/documents marked by the owner as verified 03-Sep-2026 from university websites — publish-time re-check still recommended."))
    findings = [x for x in findings if not (x["category"] == "missing" and "Eligibility criteria are not present" in x["message"]) and not (x["category"] == "missing" and x["message"].startswith("Duration is only"))]

    # ---- university roll-up ------------------------------------------------------------------
    for u in unis:
        ps = [p for p in programs if p["university_slug"] == u["slug"]]
        u["program_count"] = len(ps)
        u["modes"] = sorted({p["mode"] for p in ps}) or u["modes"]
        u["levels"] = sorted({p["level"] for p in ps})
        u["course_families"] = sorted({p["course"] for p in ps})
        heads = []
        for p in ps:
            if p["level"] not in {"UG", "PG"}:
                continue
            for fid in p["fee_ids"]:
                f = next(x for x in fees if x["id"] == fid)
                if f["plan_type"] == "standard" and f["status"] == "under_review" and not f["flags"]:
                    h = f["total_program_fee"] or f["full_plan_fee"] or f["tuition_total"]
                    if h:
                        heads.append(h)
        u["starting_total_fee"] = min(heads) if heads else None
        if u["status"] == "no_fee_data" and ps:
            u["status"] = "no_fee_data"  # unchanged: still no verified numeric fee
    internal_data["scrub_log"] = scrub_log

    (pub / "programs.json").write_text(json.dumps(programs, indent=2, ensure_ascii=False))
    (pub / "fees.json").write_text(json.dumps(fees, indent=2, ensure_ascii=False))
    (pub / "universities.json").write_text(json.dumps(unis, indent=2, ensure_ascii=False))
    (pub / "eligibility_rules.json").write_text(json.dumps(rules, indent=2, ensure_ascii=False))
    (pub / "documents.json").write_text(json.dumps(dict(items=documents, verification_flow=verification_flow, process_note=readme.get("Standard document process (write this on website)"), abc_note=readme.get("ABC / APAAR ID"), max_duration_rule=readme.get("Max duration rule (UGC)"), reservation_note=readme.get("Reserved-category relaxation"), disclaimer=readme.get("Disclaimer for website")), indent=2, ensure_ascii=False))
    (pub / "admission_steps.json").write_text(json.dumps(steps, indent=2, ensure_ascii=False))
    (internal / "partner_commercials.json").write_text(json.dumps(internal_data, indent=2, ensure_ascii=False))

    counts = rep["counts"]
    counts.update(programs=len(programs), programs_with_fee_data=sum(1 for p in programs if p["has_fee_data"]), programs_without_fee_data=sum(1 for p in programs if not p["has_fee_data"]),
                  programs_with_eligibility=sum(1 for p in programs if p["eligibility"]), programs_with_documents=sum(1 for p in programs if p["documents"]),
                  programs_with_duration=sum(1 for p in programs if p["duration_years"]), specializations=sum(len(p["specializations"]) for p in programs),
                  fee_records_unattached=unattached, eligibility_rules=len(rules), document_checklist_items=len(documents), admission_steps=len(steps),
                  commercial_sentences_scrubbed=len(scrub_log), findings=len(findings), findings_by_severity=dict(Counter(x["severity"] for x in findings)))
    rep.update(generated_on=date.today().isoformat(), sources=rep["sources"] + [MASTER], findings=findings, phase=2)
    (out / "validation_report.json").write_text(json.dumps(rep, indent=2, ensure_ascii=False))
    (out.parent / "DATA_VALIDATION_REPORT.md").write_text(report_md(rep, unis, programs, fees))
    print(json.dumps(counts, indent=2))


def report_md(rep, unis, programs, fees):
    c = rep["counts"]
    L = [f"# Data Validation Report — DegreeComplete.in (Phase 2)\n\nGenerated {rep['generated_on']}. Sources: the four July-2026 partner files **plus** the owner's admission master (`{MASTER}`, eligibility / duration / documents). **No record is published by the seed.** Every fee and program starts as `under_review`; an administrator verifies and publishes in the admin panel.\n",
         "## Counts\n\n| Metric | Value |\n|---|---|"]
    for k, v in c.items():
        if isinstance(v, dict):
            v = ", ".join(f"{a}: {b}" for a, b in v.items())
        L.append(f"| {k.replace('_', ' ')} | {v} |")
    L.append("\n## Universities\n\n| University | Status | Modes | Programs | Fee rows | Starting fee (unverified) |\n|---|---|---|---|---|---|")
    for u in unis:
        n = sum(1 for f in fees if f["university_slug"] == u["slug"])
        L.append(f"| {u['name']} | {u['status']} | {', '.join(u['modes'])} | {u['program_count']} | {n} | {('₹' + format(u['starting_total_fee'], ',')) if u.get('starting_total_fee') else '—'} |")
    L.append("\n## Findings requiring action\n")
    for sev in ("error", "warning", "info"):
        items = [x for x in rep["findings"] if x["severity"] == sev]
        if items:
            L.append(f"### {sev.upper()} ({len(items)})\n")
            L += [f"- **{x['category']}** — {x['message']}" + (f" _(sheet: {x['sheet']}{', row ' + str(x['row']) if x.get('row') else ''})_" if x.get("sheet") else "") for x in items]
            L.append("")
    L.append("## Programs flagged\n\n| Program | Flags |\n|---|---|")
    for p in programs:
        if p["flags"]:
            L.append(f"| {p['university_slug']} / {p['course_display']} ({p['mode']}) | {', '.join(p['flags'])} |")
    L.append("\n## Rules applied\n\n- Numeric fees come only from the partner fee sheets (phase 1) with row-level provenance; the master's fee text is stored as `fee_summary` for cross-checking and any >2% difference is a finding.\n- Eligibility, minimum marks, selection, documents, duration and notes come from the admission master; the owner states they were verified from university websites on 03-Sep-2026.\n- Every sentence mentioning payout / partner share / centre share / subvention was removed from student-facing text and logged in `data/internal/`.\n- Nothing is invented; missing cells stay empty and the UI shows *Contact us to confirm current details*.\n")
    return "\n".join(L)


if __name__ == "__main__":
    main()
