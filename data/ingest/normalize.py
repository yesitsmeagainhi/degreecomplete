#!/usr/bin/env python3
"""
DegreeComplete.in — source-file normalizer (July-2026 intake dataset)

Reads the four owner-supplied source files and writes:

  data/public/universities.json     student-safe university master
  data/public/programs.json         university × course × mode, with specializations
  data/public/fees.json             one record per fee row found, with provenance + status
  data/public/financing.json        student-facing loan / EMI availability
  data/internal/partner_commercials.json   CONFIDENTIAL payout / sharing / subvention data
  data/validation_report.json       machine-readable findings
  DATA_VALIDATION_REPORT.md         human-readable pre-launch report

Nothing is invented. Every numeric fee carries source_file / source_sheet / source_ref.
Every record starts as `under_review`; nothing is published by the ingest.

Run:  python3 data/ingest/normalize.py --uploads /path/to/source/files
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from openpyxl import load_workbook

INTAKE = "2026-07"
INTAKE_LABEL = "July 2026 intake"
FEE_WB = "JULY_26_FEE_STRCUTURE.xlsx"
MU_WB = "50__FEES_STRUCTURE_MU_OL_AND_ODL__1_.xlsx"
PARTNER_PDF = "Partner_Sharing_July_26__1_.pdf"
LOGO_IMG = "74f0ad99-a10e-4e66-aa00-962419ffde0c.jpeg"

# --------------------------------------------------------------------------------------
# University master. Aliases unify the different names used across the four sources.
# `partner_code` is the short name used in the partner PDF (internal); `excel_code` the
# short name used in the JULY 26 workbook. Both are kept for traceability only.
# --------------------------------------------------------------------------------------
UNIVERSITIES = [
    dict(slug="uttaranchal-university", name="Uttaranchal University", partner_code="UU", excel_code="UU",
         location="Dehradun, Uttarakhand", website="https://www.onlineuu.in", aliases=["UU", "Uttaranchal University", "Uttranchal University"]),
    dict(slug="chandigarh-university", name="Chandigarh University", partner_code="CUOL", excel_code="CUOL",
         location="Mohali, Punjab", website="https://www.onlinecu.in", aliases=["CUOL", "Chandigarh University"]),
    dict(slug="sikkim-manipal-university", name="Sikkim Manipal University", partner_code="SMU", excel_code="SMU",
         location="Gangtok, Sikkim", website="https://www.onlinemanipal.com", aliases=["SMU", "Sikkim Manipal University"]),
    dict(slug="manipal-university-jaipur", name="Manipal University Jaipur", partner_code="MUJ", excel_code="MUJ",
         location="Jaipur, Rajasthan", website="https://www.onlinemanipal.com", aliases=["MUJ", "Manipal University", "Manipal University Jaipur"]),
    dict(slug="lovely-professional-university", name="Lovely Professional University", partner_code="LPU", excel_code="LPU",
         location="Phagwara, Punjab", website="https://www.lpuonline.com", aliases=["LPU", "Lovely Profession University", "Lovely Professional University"]),
    dict(slug="upes", name="University of Petroleum and Energy Studies (UPES)", partner_code="UPES", excel_code="UPES",
         location="Dehradun, Uttarakhand", website="https://upesonline.ac.in", aliases=["UPES", "University of Petroleum and Energy Studies"]),
    dict(slug="dy-patil-university-pune", name="Dr. D. Y. Patil Vidyapeeth, Pune", partner_code="DPU", excel_code="DPU",
         location="Pune, Maharashtra", website="https://www.dypatilonline.com", aliases=["DPU (Pune)", "DPU(PUNE)", "DPU_Pune", "DYP (PUNE )", "DY Patil University (Pune)", "DPU PUNE"]),
    dict(slug="vit", name="Vellore Institute of Technology (VIT)", partner_code="VIT", excel_code="VIT",
         location="Vellore, Tamil Nadu", website="https://vitonline.in", aliases=["VIT"]),
    dict(slug="bennett-university", name="Bennett University", partner_code="VU", excel_code="BU",
         location="Greater Noida, Uttar Pradesh", website="https://www.bennettonline.com", aliases=["BENNETT", "BENNETT ", "Bennett University", "BU"]),
    dict(slug="gla-university", name="GLA University", partner_code="GLA", excel_code="GLA",
         location="Mathura, Uttar Pradesh", website="https://glaonline.com", aliases=["GLA", "Ganeshi Lal Agrawal University", "GLA University"]),
    dict(slug="amity-university", name="Amity University Online", partner_code="AMITY", excel_code="AU",
         location="Noida, Uttar Pradesh", website="https://amityonline.com", aliases=["AMITY", "Amity University", "Amity University ", "AU"]),
    dict(slug="amrita-vishwa-vidyapeetham", name="Amrita Vishwa Vidyapeetham", partner_code="Amrita", excel_code="AVV",
         location="Coimbatore, Tamil Nadu", website="https://onlineamrita.com", aliases=["Amrita", "AMRITA", "Amrita University", "Amrita Vishwa Vidyapeetham"]),
    dict(slug="shoolini-university", name="Shoolini University", partner_code="SU", excel_code="SCODE",
         location="Solan, Himachal Pradesh", website="https://shoolini.online", aliases=["Shoolini", "SHOOLINI", "Shoolini University", "SCODE"]),
    dict(slug="kurukshetra-university", name="Kurukshetra University", partner_code="KUK", excel_code="KUK",
         location="Kurukshetra, Haryana", website="https://www.kukonline.in", aliases=["KUK", "Kurushetra University", "Kurukshetra University"]),
    dict(slug="andhra-university", name="Andhra University", partner_code="Andhra", excel_code="ANU",
         location="Visakhapatnam, Andhra Pradesh", website="https://onlineausde.andhrauniversity.edu.in", aliases=["Andhra", "ANDHRA", "Andhra University", "ANU"]),
    dict(slug="sharda-university", name="Sharda University", partner_code="SHARDA", excel_code="SU",
         location="Greater Noida, Uttar Pradesh", website="https://shardaonline.ac.in", aliases=["Sharda University", "SHARDA", "Sharda"]),
    dict(slug="vivekananda-global-university", name="Vivekananda Global University", partner_code="VGU", excel_code="VGU",
         location="Jaipur, Rajasthan", website="https://onlinevgu.com", aliases=["VGU", "Vivekanand Global University", "Vivekananda Global University"]),
    dict(slug="dy-patil-university-navi-mumbai", name="D. Y. Patil University, Navi Mumbai", partner_code="DYPATIL", excel_code="DPU",
         location="Navi Mumbai, Maharashtra", website="https://dypatiluniversityonline.com", aliases=["DPU NAVI MUMBAI", "DYP (MUMBAI)", "DY Patil University (Navi Mumbai)", "Dy Patil University Mumbai"]),
    dict(slug="parul-university", name="Parul University", partner_code="PU", excel_code="PU",
         location="Vadodara, Gujarat", website="http://www.paruluniversity.online", aliases=["Parul University", "PARUL", "PU"]),
    dict(slug="nmims", name="NMIMS (Deemed-to-be University)", partner_code="NMIMS", excel_code="NMIMS",
         location="Mumbai, Maharashtra", website="https://online.nmims.edu", aliases=["NMIMS"]),
    dict(slug="galgotias-university", name="Galgotias University", partner_code="Galgotiya University", excel_code="GU",
         location="Greater Noida, Uttar Pradesh", website="https://galgotiasonline.edu.in", aliases=["Galgotias", "GALGOTIAS", "Galgotias University", "GU"]),
    dict(slug="srm-university", name="SRM University", partner_code="SRM", excel_code="SRM",
         location="Chennai, Tamil Nadu", website=None, aliases=["SRM"]),
    dict(slug="op-jindal-global-university", name="O.P. Jindal Global University (via upGrad)", partner_code="UPGRAD", excel_code="OPJ",
         location="Sonipat, Haryana", website="https://www.upgrad.com", aliases=["OP JINDAL", "OPJ", "OP Jindal"]),
    dict(slug="assam-down-town-university", name="Assam down town University", partner_code="ADTU", excel_code="ADTU",
         location="Guwahati, Assam", website="https://adtuonline.in", aliases=["ADTU", "Assam Down Town University"]),
    dict(slug="alliance-university", name="Alliance University", partner_code="Alliance", excel_code="ALU",
         location="Bengaluru, Karnataka", website="https://allianceonline.edu.in", aliases=["Alliance", "Alliance ", "ALLIANCE", "ALU"]),
    dict(slug="christ-university", name="CHRIST (Deemed to be University)", partner_code="Christ", excel_code="CHRIST",
         location="Bengaluru, Karnataka", website="https://online.christuniversity.in", aliases=["Christ", "CRIST", "Christ University", "CHRIST"]),
    # Separate source file (Mangalayatan). Not in the College Vidya partner annexure.
    dict(slug="mangalayatan-university", name="Mangalayatan University", partner_code=None, excel_code="MU",
         location="Aligarh, Uttar Pradesh", website=None, aliases=["MU", "Mangalayatan"]),
    # DBA / executive partners listed in the DBA comparison sheet.
    dict(slug="golden-gate-university", name="Golden Gate University, San Francisco (DBA via upGrad)", partner_code="UPGRAD", excel_code=None,
         location="San Francisco, USA", website="https://www.upgrad.com/dba-from-golden-gate-university/", aliases=["Golden Gate University"]),
    dict(slug="rushford-business-school", name="Rushford Business School (DBA via upGrad)", partner_code="UPGRAD", excel_code=None,
         location="Switzerland", website="https://www.upgrad.com/dba-from-rushford-business-school/", aliases=["Rushford Business School"]),
    dict(slug="ssbm-geneva", name="Swiss School of Business and Management (Executive DBA via upGrad)", partner_code="UPGRAD", excel_code=None,
         location="Geneva, Switzerland", website="https://www.upgrad.com/doctor-of-business-administration-ssbm/", aliases=["SSBM"]),
    dict(slug="esgci-paris", name="ESGCI Paris (DBA via upGrad)", partner_code="UPGRAD", excel_code=None,
         location="Paris, France", website="https://www.upgrad.com/doctor-of-business-administration-from-esgci/", aliases=["ESGCI"]),
    dict(slug="eimt", name="European Institute of Technology & Management (EIMT) — DBA", partner_code=None, excel_code=None,
         location="Switzerland", website="https://www.eimt.edu.eu/swiss/doctorate-in-business-administration", aliases=["EIMT"]),
    dict(slug="birchwood-university", name="Birchwood University — DBA", partner_code=None, excel_code=None,
         location="Florida, USA", website=None, aliases=["Birchwood University"]),
]
ALIAS = {}
for u in UNIVERSITIES:
    for a in u["aliases"] + [u["slug"], u["name"]]:
        ALIAS[a.strip().lower()] = u["slug"]


def uni(name: str) -> str:
    key = (name or "").strip().lower()
    if key in ALIAS:
        return ALIAS[key]
    raise KeyError(f"Unknown university alias: {name!r}")


# --------------------------------------------------------------------------------------
# Course canonicalisation. The master catalogue spells B.Com five different ways.
# --------------------------------------------------------------------------------------
COURSE_ALIASES = {
    "b.com": "B.Com", "bcom": "B.Com", "b. com": "B.Com", "b.com (hons.)": "B.Com (Hons)", "b.com ( hons. )": "B.Com (Hons)",
    "m.com": "M.Com", "mcom": "M.Com", "m. com": "M.Com", "m.com.": "M.Com", "m com": "M.Com",
    "msc": "M.Sc", "m.sc": "M.Sc", "m.sc.": "M.Sc", "b.sc.": "B.Sc", "bsc": "B.Sc",
    "bba": "BBA", "bca": "BCA", "mba": "MBA", "mca": "MCA", "ba": "BA", "ma": "MA", "msw": "MSW",
    "bba plus": "BBA Plus", "mba plus": "MBA Plus", "bba - plus": "BBA Plus", "mba - plus": "MBA Plus", "mba (wx)": "MBA (WX)", "mba wx": "MBA (WX)",
    "mba executive": "MBA Executive", "pg certificates": "PG Certificate", "pg certificate": "PG Certificate",
    "certificate": "Certificate", "diploma": "Diploma", "pg diploma": "PG Diploma", "pg program": "PG Program",
    "dca": "DCA", "pgdca": "PGDCA", "pgdjmc": "PGDJMC", "pgdbm": "PGDBM", "b.lib": "B.Lib", "m.lib": "M.Lib",
    "dba": "DBA", "executive dba": "Executive DBA", "bfp": "Certificate",
}
LEVEL_BY_COURSE = {
    "BA": "UG", "BBA": "UG", "BCA": "UG", "B.Com": "UG", "B.Com (Hons)": "UG", "B.Sc": "UG", "BBA Plus": "UG", "B.Lib": "UG",
    "MA": "PG", "MBA": "PG", "MCA": "PG", "M.Com": "PG", "M.Sc": "PG", "MSW": "PG", "MBA Plus": "PG", "MBA (WX)": "PG",
    "MBA Executive": "PG", "PG Program": "PG", "M.Lib": "PG",
    "PG Certificate": "Certificate", "Certificate": "Certificate",
    "Diploma": "Diploma", "DCA": "Diploma", "PG Diploma": "PG Diploma", "PGDCA": "PG Diploma", "PGDJMC": "PG Diploma", "PGDBM": "PG Diploma",
    "DBA": "Doctoral", "Executive DBA": "Doctoral",
}


def course(name: str) -> str:
    k = re.sub(r"\s+", " ", (name or "").strip()).lower()
    return COURSE_ALIASES.get(k, name.strip())


ACRONYMS = {"AI", "ML", "HR", "IT", "JMC", "BFSI", "ESG", "ACCA", "UX", "UI", "IB", "HRM", "PCB", "PCM", "ZBC", "AR", "VR", "ELT", "MSW", "WX", "MBA", "BBA"}
SPEC_ALIASES = {"jmc": "Journalism & Mass Communication", "hrm": "Human Resource Management", "hr": "Human Resource Management", "public admi.": "Public Administration", "genral": "General"}


def nice_spec(s: str | None) -> str | None:
    """Title-case ALL-CAPS specialisations from the sources without touching mixed-case ones."""
    if not s:
        return None
    s = re.sub(r"\s+", " ", s).strip().strip("'").strip()
    if s.lower() in SPEC_ALIASES:
        return SPEC_ALIASES[s.lower()]
    if s.isupper() and len(s) > 3:
        words = []
        for w in s.split(" "):
            core = re.sub(r"[^A-Z]", "", w)
            words.append(w if core in ACRONYMS else w.capitalize())
        s = " ".join(words)
    return s


COURSE_PREFIX = re.compile(r"^(MBA|MCA|MA|M\.?Sc\.?|M\.?Com\.?|BBA|BCA|BA|B\.?Com\.?|B\.?Sc\.?|MSW)\s*(?:\((.+)\)|[-–]\s*(.+)|\s+(.+))?\s*$", re.I)


def split_course(name: str) -> tuple[str, str | None]:
    """'MA (ENGLISH)' -> ('MA', 'English'); 'MA - JMC' -> ('MA', 'Journalism & Mass Communication'); 'MBA' -> ('MBA', None)."""
    n = re.sub(r"\s+", " ", (name or "")).strip()
    if course(n) in LEVEL_BY_COURSE:
        return course(n), None
    m = COURSE_PREFIX.match(n)
    if not m:
        return n, None
    spec = m.group(2) or m.group(3) or m.group(4)
    return course(m.group(1)), nice_spec(spec)


# --------------------------------------------------------------------------------------
# Money parsing. Handles ₹ / Rs. / lakh commas / trailing "/-" / ".00".
# Returns int rupees or None. Never guesses on ranges or text.
# --------------------------------------------------------------------------------------
NUM = re.compile(r"(\d[\d,]*(?:\.\d+)?)")


def money(v) -> int | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(round(v))
    s = str(v).strip()
    if s in {"", "-", "—", "----", "NA", "N/A"}:
        return None
    m = NUM.search(s.replace("₹", "").replace("Rs.", "").replace("Rs", ""))
    if not m:
        return None
    try:
        return int(round(float(m.group(1).replace(",", ""))))
    except ValueError:
        return None


def txt(v) -> str | None:
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s or None


# --------------------------------------------------------------------------------------
class Ingest:
    def __init__(self, uploads: Path, out: Path):
        self.uploads = uploads
        self.out = out
        self.fees: list[dict] = []
        self.programs: dict[tuple, dict] = {}
        self.findings: list[dict] = []
        self.internal: dict = {"partner_payouts": [], "center_sharing": [], "subvention": [], "notes": []}
        self.financing: list[dict] = []
        self.univ_attr: dict[str, dict] = defaultdict(dict)
        self.rows_by_sheet: Counter = Counter()

    # ---- helpers ------------------------------------------------------------------
    def flag(self, severity: str, category: str, message: str, **ctx):
        self.findings.append(dict(severity=severity, category=category, message=message, **ctx))

    def program(self, slug: str, crs: str, mode: str, display: str | None = None, spec: str | None = None, source: str | None = None):
        crs_c = course(crs)
        key = (slug, crs_c, mode)
        p = self.programs.setdefault(key, dict(
            university_slug=slug, course=crs_c, course_display=display or crs_c, mode=mode,
            level=LEVEL_BY_COURSE.get(crs_c, "Other"), specializations=[], sources=set(), in_master_catalogue=False,
        ))
        if spec:
            s = nice_spec(txt(spec))
            if s and s.lower() not in {x.lower() for x in p["specializations"]}:
                p["specializations"].append(s)
        if source:
            p["sources"].add(source)
        return p

    def fee(self, slug, crs, mode, sheet, ref, **fields):
        crs_c = course(crs)
        if fields.get("specialization") is None and crs_c not in LEVEL_BY_COURSE:
            crs_c, auto_spec = split_course(crs)
            if auto_spec:
                fields["specialization"] = auto_spec
        if fields.get("specialization"):
            fields["specialization"] = nice_spec(fields["specialization"])
            if fields["specialization"].upper() == "HONS" and crs_c == "B.Com":
                crs_c, fields["specialization"] = "B.Com (Hons)", None
        rec = dict(
            university_slug=slug, course=crs_c, course_display=fields.pop("course_display", crs.strip()),
            specialization=fields.pop("specialization", None), mode=mode, level=LEVEL_BY_COURSE.get(crs_c, "Other"),
            plan_type=fields.pop("plan_type", "standard"), currency=fields.pop("currency", "INR"),
            registration_fee=None, application_fee=None, admission_fee=None, alumni_fee=None,
            exam_fee=None, exam_fee_basis=None,
            tuition_per_semester=None, tuition_per_year=None, tuition_total=None,
            semester_plan_fee=None, annual_plan_fee=None, full_plan_fee=None,
            total_program_fee=None, scholarship_total_fee=None, discount_pct=None,
            installments=None, semesters=None, duration_years=None, notes=None,
            source_file=FEE_WB, source_sheet=sheet, source_ref=str(ref), effective_intake=INTAKE,
            status="under_review", flags=[],
        )
        rec.update(fields)
        rec["course"] = crs_c
        rec["level"] = LEVEL_BY_COURSE.get(crs_c, "Other")
        # A fee row with no numeric value anywhere is "missing", not "under review".
        numeric = [rec[k] for k in ("registration_fee", "exam_fee", "tuition_per_semester", "tuition_per_year", "tuition_total",
                                     "semester_plan_fee", "annual_plan_fee", "full_plan_fee", "total_program_fee", "scholarship_total_fee")]
        if not any(isinstance(x, int) for x in numeric) and not rec["installments"]:
            rec["status"] = "missing"
            rec["flags"].append("no_numeric_fee_in_source")
        self.fees.append(rec)
        self.program(slug, crs_c, mode, display=crs_c, spec=rec["specialization"], source=f"{rec['source_file']}#{sheet}")
        self.rows_by_sheet[sheet] += 1
        return rec

    def sheet(self, wb, name, width=20):
        ws = wb[name]
        return [(list(r) + [None] * width)[:width] for r in ws.iter_rows(values_only=True)]

    # ---- master sheets --------------------------------------------------------------
    def parse_university_sheet(self, wb):
        rows = self.sheet(wb, "UNIVERSITY ")
        for i, r in enumerate(rows[2:], start=3):
            if not r[1]:
                continue
            name = txt(r[1])
            try:
                slug = uni(name)
            except KeyError:
                if name and "EXECUTIVE" in name.upper():
                    self.internal["notes"].append(f"UNIVERSITY sheet row {i}: '{name}' — NMIMS Executive line has no fee data; treat as note only.")
                    continue
                self.flag("warning", "unmapped_university", f"UNIVERSITY sheet row {i}: cannot map '{name}'", sheet="UNIVERSITY", row=i)
                continue
            self.univ_attr[slug].update(dict(
                registration_fee_text=txt(r[3]), exam_fee_text=txt(r[4]),
                loan_available=(txt(r[5]) or "").upper() == "YES" if txt(r[5]) else None,
                loan_partners_text=txt(r[6]), website_from_sheet=txt(r[7]),
            ))

    def parse_all_in_one(self, wb):
        rows = self.sheet(wb, "ALL IN ONE")
        seen = Counter()
        for i, r in enumerate(rows[1:], start=2):
            if not r[1] or not r[3]:
                continue
            try:
                slug = uni(txt(r[1]))
            except KeyError:
                self.flag("warning", "unmapped_university", f"ALL IN ONE row {i}: cannot map '{r[1]}'", sheet="ALL IN ONE", row=i)
                continue
            mode = txt(r[2]) or "Online"
            p = self.program(slug, txt(r[3]), mode, display=txt(r[3]), spec=txt(r[4]), source=f"{FEE_WB}#ALL IN ONE")
            p["in_master_catalogue"] = True
            k = (slug, p["course"], (txt(r[4]) or "").lower())
            seen[k] += 1
            if seen[k] == 2:
                self.flag("info", "duplicate", f"ALL IN ONE: duplicate program row for {slug} / {p['course']} / {r[4]}", sheet="ALL IN ONE", row=i)

    def parse_loan_structure(self, wb):
        rows = self.sheet(wb, "LOAN STRUCTURE ")
        current = None
        for i, r in enumerate(rows, start=1):
            name = txt(r[1])
            if name:
                try:
                    current = uni(name)
                except KeyError:
                    self.flag("warning", "unmapped_university", f"LOAN STRUCTURE row {i}: cannot map '{name}'", sheet="LOAN STRUCTURE", row=i)
                    current = None
                    continue
                partner = txt(r[2])
                self.financing.append(dict(
                    university_slug=current, loan_partners=partner, rate_of_interest=txt(r[3]), applies_to=txt(r[4]),
                    no_loan=bool(partner and "NO LOAN" in partner.upper()), source_file=FEE_WB, source_sheet="LOAN STRUCTURE", source_ref=f"row {i}",
                    detail_rows=[],
                ))
            elif current and any(r[2:]):
                self.financing[-1]["detail_rows"].append([txt(c) for c in r[2:] if txt(c)])

    def parse_subvention(self, wb):
        rows = self.sheet(wb, "SUBVENTION CHARGES CALCULATION ")
        for i, r in enumerate(rows, start=1):
            vals = [txt(c) for c in r]
            if any(vals):
                self.internal["subvention"].append(dict(sheet="SUBVENTION CHARGES CALCULATION", row=i, cells=[v for v in vals if v]))

    # ---- simple tabular sheets ------------------------------------------------------
    def parse_simple_table(self, wb, sheet, slug, header_row, colmap, mode="Online", extra=None):
        """colmap: dict of field -> column index. Rows after header_row with a course value."""
        rows = self.sheet(wb, sheet)
        for i, r in enumerate(rows[header_row:], start=header_row + 1):
            crs = txt(r[colmap["course"]])
            if not crs:
                continue
            fields = {}
            for f, c in colmap.items():
                if f in ("course", "specialization"):
                    continue
                fields[f] = money(r[c])
            if "specialization" in colmap:
                fields["specialization"] = txt(r[colmap["specialization"]])
            if extra:
                fields.update(extra)
            self.fee(slug, crs, mode, sheet, f"row {i}", **fields)

    # ---- per-university parsers -----------------------------------------------------
    def parse_smu(self, wb):
        self.parse_simple_table(wb, "SMU", "sikkim-manipal-university", 2,
                                dict(course=3, registration_fee=4, semester_plan_fee=5, annual_plan_fee=6, total_program_fee=7))

    def parse_muj(self, wb):
        rows = self.sheet(wb, "MUJ")
        for i, r in enumerate(rows[3:], start=4):
            if not r[1]:
                continue
            self.fee("manipal-university-jaipur", txt(r[1]), "Online", "MUJ", f"row {i}",
                     tuition_per_semester=money(r[2]), tuition_total=money(r[3]), total_program_fee=money(r[3]),
                     registration_fee=500, notes="Registration fee ₹500 taken from UNIVERSITY sheet; exam fee listed as 0 there.")

    def parse_uu(self, wb):
        rows = self.sheet(wb, "UU")
        for i, r in enumerate(rows[2:], start=3):
            if not r[3]:
                continue
            self.fee("uttaranchal-university", txt(r[3]), "Online", "UU", f"row {i}", specialization=txt(r[4]),
                     registration_fee=money(r[5]), exam_fee=money(r[6]), exam_fee_basis="per_semester",
                     tuition_total=money(r[7]), semester_plan_fee=money(r[8]), annual_plan_fee=money(r[9]), full_plan_fee=money(r[10]),
                     total_program_fee=money(r[7]),
                     notes="'Total Fee (Before Scholarship)' per source; semester/annual/one-time columns are what the student pays under each plan. Exam fee ₹2,500 per semester per UNIVERSITY sheet.")

    def parse_sharda(self, wb):
        rows = self.sheet(wb, "SHARDA")
        for i, r in enumerate(rows[2:], start=3):
            if not r[3]:
                continue
            rec = self.fee("sharda-university", txt(r[3]), "Online", "SHARDA", f"row {i}", specialization=txt(r[4]),
                           registration_fee=money(r[5]), exam_fee=money(r[6]), exam_fee_basis="unspecified",
                           semester_plan_fee=money(r[7]), annual_plan_fee=money(r[8]), full_plan_fee=money(r[9]))
            rec["status"] = "on_hold"
            rec["flags"].append("partner_on_hold")

    def parse_kuk(self, wb):
        rows = self.sheet(wb, "KUK")
        i = 0
        while i < len(rows):
            r = rows[i]
            if txt(r[0]) == "KUK" or (txt(r[1]) and txt(r[1]).startswith("B Com")):
                name = txt(r[1]) or ""
                # gather continuation lines for the programme name
                j = i + 1
                extra_lines = []
                while j < len(rows) and not txt(rows[j][0]) and not (txt(rows[j][1]) or "").startswith("B Com") and (txt(rows[j][1]) or txt(rows[j][3])):
                    if txt(rows[j][1]):
                        extra_lines.append(txt(rows[j][1]))
                    j += 1
                full = " ".join([name] + extra_lines)
                sem_text = " ".join(t for t in [txt(r[3])] + [txt(rows[k][3]) for k in range(i + 1, j)] if t)
                crs_raw = re.split(r"[-(]", name)[0].strip()
                crs_raw = {"B Com": "B.Com", "M Com": "M.Com"}.get(crs_raw, crs_raw)
                if name.upper().startswith("DIPLOMA"):
                    crs_raw, display = "Diploma", name
                elif name.upper().startswith("CERTIFICATE"):
                    crs_raw, display = "Certificate", name
                else:
                    display = crs_raw.strip()
                specs = [] if crs_raw in {"Diploma", "Certificate"} else (re.findall(r"\d\.\s*([A-Za-z &.]+?)(?=,|\)|$|\s\d\.)", full) or re.findall(r"\(([^)]*)", full))
                spec_list = []
                for s in specs:
                    spec_list += [x.strip() for x in s.split(",") if x.strip()]
                if crs_raw == "MA":
                    spec_list = [x.strip() for x in " ".join(extra_lines).split(",") if x.strip()]
                sem_fee = money(r[3]) if isinstance(r[3], (int, float)) else None
                notes = f"Semester fee as stated in source: {sem_text}" if sem_text and sem_fee is None else None
                rec = self.fee("kurukshetra-university", crs_raw, "Online", "KUK", f"row {i+1}", course_display=display,
                               registration_fee=money(r[2]), tuition_per_semester=sem_fee, total_program_fee=money(r[4]), notes=notes)
                for s in spec_list:
                    self.program("kurukshetra-university", crs_raw, "Online", spec=s)
                if sem_fee is None and sem_text and sem_text.strip() != "-":
                    rec["flags"].append("semester_fee_is_text_needs_admin_entry")
                i = j
            else:
                i += 1

    def parse_lpu(self, wb):
        rows = self.sheet(wb, "LPU  ")
        for i, r in enumerate(rows[4:], start=5):
            if not r[1] or not isinstance(r[2], (int, float)):
                continue
            name = txt(r[1])
            m = re.match(r"^(M\.Sc|MA|M\.COM|MCA|MBA|BA|BCA|BBA|Diploma in [A-Za-z ]+?)\s*(?:\(([^)]*)\))?", name)
            crs_raw = m.group(1) if m else name
            spec = m.group(2) if m and m.group(2) else None
            if crs_raw.startswith("Diploma"):
                crs_raw, spec = "Diploma", None
            rec = self.fee("lovely-professional-university", crs_raw, "Online", "LPU", f"row {i}", course_display=name, specialization=spec,
                           semesters=int(r[2]), tuition_per_semester=money(r[3]), tuition_total=money(r[4]), total_program_fee=money(r[4]),
                           registration_fee=1000, exam_fee=2000, exam_fee_basis="per_semester_included",
                           notes="Exam fee ₹2,000/sem is included in programme fee per source. Registration ₹1,000 non-refundable. Initial payment ₹5,000 adjusted against fee.")
            rec["duration_years"] = int(r[2]) / 2
            # Student Grant-I (20%) plan and No-cost-EMI plan as separate scholarship/loan records
            self.fee("lovely-professional-university", crs_raw, "Online", "LPU", f"row {i}", course_display=name, specialization=spec,
                     plan_type="scholarship", semesters=int(r[2]), semester_plan_fee=money(r[5]), full_plan_fee=money(r[6]),
                     total_program_fee=money(r[6]), discount_pct=20,
                     notes="Student Grant-I: 20% waiver on programme fee; lumpsum adds a further 10% per source.")
            self.fee("lovely-professional-university", crs_raw, "Online", "LPU", f"row {i}", course_display=name, specialization=spec,
                     plan_type="loan", semesters=int(r[2]), full_plan_fee=money(r[7]), total_program_fee=money(r[7]),
                     notes="No-Cost-EMI loan (all loan agencies), 20% student grant applied. Coupon codes not applicable.")

    def parse_dpu_pune(self, wb):
        rows = self.sheet(wb, "DPU (PUNE)")
        def sems(r, a, b):
            return [money(x) for x in r[a:b] if money(x) is not None]
        # BBA 3-year, Indian civilian
        r = rows[4]
        bba = sems(r, 2, 8)
        self.fee("dy-patil-university-pune", "BBA", "Online", "DPU (PUNE)", "row 5", installments=bba, semesters=len(bba),
                 total_program_fee=money(r[8]), tuition_total=money(r[8]), duration_years=3,
                 notes="Indian civilian, 3-year track. Scholarship of ₹5,000 for BBA if full fee paid in two transactions within 15 days (source note).")
        self.fee("dy-patil-university-pune", "BBA", "Online", "DPU (PUNE)", "row 5", course_display="BBA (4-year track)",
                 installments=bba + sems(r, 9, 11), semesters=8, total_program_fee=money(r[11]), tuition_total=money(r[11]), duration_years=4,
                 notes="Indian civilian, 4-year track per source.")
        r = rows[9]
        mba = sems(r, 2, 6)
        self.fee("dy-patil-university-pune", "MBA", "Online", "DPU (PUNE)", "row 10", installments=mba, semesters=4,
                 total_program_fee=money(r[6]), tuition_total=money(r[6]), duration_years=2,
                 notes="Indian civilian. Scholarship of ₹10,000 for MBA if full fee paid in single/two transactions within 15 days (source note).")
        r = rows[13]
        self.fee("dy-patil-university-pune", "MBA", "Online", "DPU (PUNE)", "row 14", course_display="MBA (Working Professional)", plan_type="working_professional",
                 installments=sems(r, 2, 6), semesters=4, total_program_fee=money(r[6]), tuition_total=money(r[6]), duration_years=2)
        r = rows[20]
        self.fee("dy-patil-university-pune", "MCA", "Online", "DPU (PUNE)", "row 21", installments=sems(r, 1, 5), semesters=4,
                 total_program_fee=money(r[5]), tuition_total=money(r[5]), duration_years=2)
        self.fee("dy-patil-university-pune", "Certificate", "Online", "DPU (PUNE)", "row 27", course_display="Certificate Programme in Digital Marketing",
                 total_program_fee=money(rows[26][2]))
        self.fee("dy-patil-university-pune", "Certificate", "Online", "DPU (PUNE)", "row 32", course_display="Certificate Programme in Hospital & Health Care Management",
                 total_program_fee=money(rows[31][2]))
        self.internal["notes"].append("DPU (PUNE) sheet also lists USD fees for international students (rows 6, 11, 15, 22, 28, 33) — not ingested; domestic only.")

    def parse_vgu(self, wb):
        rows = self.sheet(wb, "VGU")
        seen = set()
        for i, r in enumerate(rows[2:], start=3):
            if not r[1]:
                continue
            key = txt(r[1])
            if key in seen:
                self.flag("info", "duplicate", f"VGU sheet row {i}: '{key}' listed twice", sheet="VGU", row=i)
                continue
            seen.add(key)
            self.fee("vivekananda-global-university", key, "Online", "VGU", f"row {i}",
                     registration_fee=1000, exam_fee=1500, exam_fee_basis="per_semester",
                     semester_plan_fee=money(r[2]), annual_plan_fee=money(r[4]), full_plan_fee=money(r[6]),
                     notes="Annual plan carries 10% and full-fee plan 15% reduction per source column headers.")
            self.fee("vivekananda-global-university", key, "Online", "VGU", f"row {i}", plan_type="scholarship",
                     registration_fee=1000, exam_fee=1500, exam_fee_basis="per_semester",
                     semester_plan_fee=money(r[3]), annual_plan_fee=money(r[5]), full_plan_fee=money(r[7]),
                     notes="Scholarship fee columns per source; eligibility criteria for the scholarship not stated in source.")

    def parse_dpu_nm(self, wb):
        rows = self.sheet(wb, "DPU (NAVI MUMBAI )")
        for i, r in enumerate(rows[2:], start=3):
            if not r[3]:
                continue
            self.fee("dy-patil-university-navi-mumbai", txt(r[3]), "Online", "DPU (NAVI MUMBAI )", f"row {i}", course_display=txt(r[3]), specialization=txt(r[4]),
                     registration_fee=money(r[5]), exam_fee=money(r[6]), exam_fee_basis="unspecified",
                     semester_plan_fee=money(r[7]), annual_plan_fee=money(r[8]), full_plan_fee=money(r[9]))

    def parse_gla(self, wb):
        rows = self.sheet(wb, "GLA  ")
        current = None
        block = {}
        def flush(rownum):
            if current and block:
                self.fee("gla-university", current, "Online", "GLA  ", f"rows {block.get('start')}–{rownum}", course_display=current,
                         registration_fee=block.get("reg"), alumni_fee=block.get("alumni"),
                         tuition_per_semester=block.get("tu_sem"), tuition_per_year=block.get("tu_year"), tuition_total=block.get("tu_total"),
                         exam_fee=block.get("ex_sem"), exam_fee_basis="per_semester",
                         notes=f"Exam fee ₹{block.get('ex_year')}/year, ₹{block.get('ex_total')} total. Alumni fee one-time. Semester/annual/total tuition per source.")
        for i, r in enumerate(rows, start=1):
            c0 = txt(r[0])
            if not c0:
                continue
            if c0 in {"B.COM ( Hons. )", "BCA", "MCA", "BBA", "MBA"}:
                flush(i - 1)
                current = {"B.COM ( Hons. )": "B.Com (Hons)"}.get(c0, c0)
                block = {"start": i}
                continue
            if c0.startswith("Registration"):
                block["reg"] = money(c0)
            elif c0.startswith("Alumni"):
                block["alumni"] = money(c0)
            elif c0.startswith("Tuition"):
                block["tu_sem"] = money(c0); block["tu_year"] = money(r[2]); block["tu_total"] = money(r[4])
            elif c0.startswith("Exam"):
                block["ex_sem"] = money(c0.replace(" ,", ",")); block["ex_year"] = money(r[2]); block["ex_total"] = money(r[4])
        flush(len(rows))

    def parse_upes(self, wb):
        rows = self.sheet(wb, "UPES ")
        for i, r in enumerate(rows[2:], start=3):
            if not r[1]:
                continue
            crs = txt(r[1])
            crs = {"Certificate ": "PG Certificate", "Certificate": "PG Certificate"}.get(crs, crs)
            self.fee("upes", crs, "Online", "UPES ", f"row {i}", specialization=txt(r[2]), total_program_fee=money(r[3]), tuition_total=money(r[3]),
                     registration_fee=1000, notes="Registration ₹1,000 per UNIVERSITY sheet; exam fee listed as 0 there.")

    def parse_amrita(self, wb):
        rows = self.sheet(wb, "AMRITA")
        for i, r in enumerate(rows[1:], start=2):
            if not r[1] or not isinstance(r[2], (int, float)):
                continue
            name = txt(r[1])
            m = re.match(r"^(BBA|BCA|BCOM|MBA|MCA|MCOM)\b\s*-?\s*(.*)$", name)
            crs_raw, spec = (m.group(1), m.group(2).strip() or None) if m else (name, None)
            self.fee("amrita-vishwa-vidyapeetham", crs_raw, "Online", "AMRITA", f"row {i}", course_display=name, specialization=spec,
                     tuition_per_semester=money(r[2]), tuition_total=money(r[3]), total_program_fee=money(r[3]),
                     registration_fee=700, exam_fee=2750, exam_fee_basis="unspecified",
                     notes="Fees exclude exam fee per source. Registration ₹700 and exam ₹2,750 from AMRITA sheet footer.")

    def parse_andhra(self, wb):
        rows = self.sheet(wb, "ANDHRA ")
        self.fee("andhra-university", "MA", "Online", "ANDHRA ", "rows 2–7", specialization="Sociology",
                 registration_fee=money(rows[3][2]), tuition_total=money(rows[4][2]), exam_fee=money(rows[5][2]), exam_fee_basis="total",
                 total_program_fee=money(rows[6][2]), tuition_per_year=money(rows[4][1]), duration_years=2,
                 notes="Year-1 payable ₹29,250 (reg + programme + exam) per source.")
        self.fee("andhra-university", "MBA", "Online", "ANDHRA ", "rows 9–14",
                 application_fee=money(rows[10][2]), tuition_total=money(rows[11][2]), exam_fee=money(rows[12][2]), exam_fee_basis="total",
                 total_program_fee=money(rows[13][2]), tuition_per_semester=money(rows[11][1]), semesters=4, duration_years=2,
                 notes="Sem-1 payable ₹16,300 per source.")
        self.fee("andhra-university", "MCA", "Online", "ANDHRA ", "rows 16–21",
                 application_fee=money(rows[17][2]), tuition_total=money(rows[18][2]), exam_fee=money(rows[19][2]), exam_fee_basis="total",
                 total_program_fee=money(rows[20][2]), tuition_per_semester=money(rows[18][1]), semesters=4, duration_years=2,
                 notes="Sem-1 payable ₹19,800 per source.")

    def parse_nmims(self, wb):
        rows = self.sheet(wb, "NMIMS")
        for i, r in enumerate(rows, start=1):
            name = txt(r[0])
            if not name or name in {"Program Name"} or not r[1]:
                continue
            if "SECOND AND THIRD" in name.upper():
                rec = self.fee("nmims", "BBA", "Online", "NMIMS", f"row {i}", course_display="BBA Business Analytics", specialization="Business Analytics",
                               total_program_fee=145000, registration_fee=money(r[7]),
                               notes="Source text: 'first year fee is same, second and third year fee is 30000, total fee 145000'. Needs admin confirmation of per-sem amounts.")
                rec["flags"].append("free_text_fee_needs_admin_entry")
                continue
            crs_raw = "MBA (WX)" if "WX" in name.upper() else name
            self.fee("nmims", crs_raw, "Online", "NMIMS", f"row {i}", course_display=name, semesters=int(r[1]) if isinstance(r[1], (int, float)) else None,
                     tuition_per_semester=money(r[3]), semester_plan_fee=money(r[2]), annual_plan_fee=money(r[4]), full_plan_fee=money(r[6]),
                     tuition_per_year=money(r[5]), registration_fee=money(r[7]), exam_fee=money(r[8]), exam_fee_basis="per_subject_reattempt",
                     total_program_fee=money(r[6]) or money(r[2]),
                     notes="Columns: 'Course Fee' under SEM/YEARLY/FULL = total programme fee payable under that plan; Sem Fee / Yearly Fee = instalment. Project fee ₹1,500 where listed.")

    def parse_parul(self, wb):
        rows = self.sheet(wb, "PARUL ")
        seen = set()
        for i, r in enumerate(rows[2:], start=3):
            if not r[3]:
                continue
            key = (txt(r[3]), (txt(r[4]) or "").lower())
            if key in seen:
                self.flag("info", "duplicate", f"PARUL sheet row {i}: duplicate '{r[3]} / {r[4]}'", sheet="PARUL", row=i)
                continue
            seen.add(key)
            self.fee("parul-university", txt(r[3]), "Online", "PARUL ", f"row {i}", course_display=txt(r[3]), specialization=txt(r[4]),
                     registration_fee=money(r[5]), exam_fee=money(r[6]), exam_fee_basis="unspecified",
                     semester_plan_fee=money(r[7]), annual_plan_fee=money(r[8]), full_plan_fee=money(r[9]))

    def parse_galgotias(self, wb):
        rows = self.sheet(wb, "GALGOTIAS")
        fix = {"MA English MA": ("MA", "English"), "Economics": ("MA", "Economics"), "M. Com.": ("M.Com", None)}
        for i, r in enumerate(rows[2:], start=3):
            if not r[1]:
                continue
            name = txt(r[1])
            crs_raw, spec = fix.get(name, (name, None))
            rec = self.fee("galgotias-university", crs_raw, "Online", "GALGOTIAS", f"row {i}", course_display=name, specialization=spec,
                           registration_fee=money(r[2]), tuition_per_year=money(r[3]), exam_fee=money(r[4]), exam_fee_basis="per_year",
                           alumni_fee=money(r[5]), total_program_fee=money(r[6]), duration_years=money(r[7]))
            if name in fix and name != "M. Com.":
                rec["flags"].append("course_name_repaired_from_broken_source_row")

    def parse_amity(self, wb):
        rows = self.sheet(wb, "AMITY ")
        def split(name):
            m = re.match(r"^([A-Z. ]+?)\s*[-–]\s*(.+)$", name)
            if m:
                return m.group(1).strip(), m.group(2).strip().replace("_", " ")
            return name.strip(), None
        for i, r in enumerate(rows[2:], start=3):
            if not r[2]:
                continue
            name = txt(r[2])
            crs_raw, spec = split(name)
            crs_raw = {"BCOM": "B.Com", "MCOM": "M.Com", "MSC": "M.Sc", "BBA - MBA": "BBA", "BCOM - MBA": "B.Com", "BCA - MCA": "BCA"}.get(crs_raw, crs_raw)
            if txt(r[1]) == "UG - PG":
                crs_raw, spec = name.replace(" - ", "+").replace("BCOM", "B.Com"), None
                lvl_display = name + " (integrated)"
            else:
                lvl_display = name
            self.fee("amity-university", crs_raw, "Online", "AMITY ", f"row {i} (direct payment block)", course_display=lvl_display, specialization=spec,
                     plan_type="standard", tuition_per_semester=money(r[3]), discount_pct=int(round((r[4] or 0) * 100)) if isinstance(r[4], (int, float)) else None,
                     full_plan_fee=money(r[5]), annual_plan_fee=money(r[7]),
                     notes=f"Direct payment. One-time fee reflects {int(round((r[4] or 0)*100)) if isinstance(r[4],(int,float)) else 0}% discount; annual reflects {int(round((r[6] or 0)*100)) if isinstance(r[6],(int,float)) else 0}% per source.")
            self.fee("amity-university", crs_raw, "Online", "AMITY ", f"row {i} (loan block)", course_display=lvl_display, specialization=spec,
                     plan_type="loan", tuition_per_semester=money(r[12]), full_plan_fee=money(r[14]), annual_plan_fee=money(r[16]),
                     discount_pct=int(round((r[13] or 0) * 100)) if isinstance(r[13], (int, float)) else None,
                     notes="Loan (general): one-time 5% and yearly 3% discount per source header.")

    def parse_cu(self, wb):
        rows = self.sheet(wb, "CHANDIGARH UNI.")
        for i, r in enumerate(rows[4:], start=5):
            if not r[1]:
                continue
            name = txt(r[1])
            m = re.match(r"^(BBA|BCA|BA|MBA|MCA|MAJMC|MSc|MA)\s*(.*)$", name)
            crs_raw, spec = (m.group(1), m.group(2).strip() or None) if m else (name, None)
            if crs_raw == "MAJMC":
                crs_raw, spec = "MA", "Journalism & Mass Communication"
            if crs_raw == "BA" and spec and spec.upper().startswith("JMC"):
                spec = "Journalism & Mass Communication"
            self.fee("chandigarh-university", crs_raw, "Online", "CHANDIGARH UNI.", f"row {i}", course_display=name, specialization=spec,
                     registration_fee=money(r[3]), discount_pct=int(round(r[4] * 100)) if isinstance(r[4], (int, float)) else None,
                     semester_plan_fee=money(r[5]), annual_plan_fee=money(r[6]), full_plan_fee=money(r[7]),
                     notes="Amounts are 'with EBD' (early-bird discount) per source; EBD % recorded in discount_pct. Registration/prospectus ₹1,000.")

    def parse_bennett(self, wb):
        rows = self.sheet(wb, "BENNETT")
        for col, crs_raw in ((1, "MBA"), (2, "BBA")):
            self.fee("bennett-university", crs_raw, "Online", "BENNETT", f"col {col}", total_program_fee=money(rows[3][col]), tuition_total=money(rows[3][col]),
                     registration_fee=1500, exam_fee=800, exam_fee_basis="unspecified",
                     notes=f"Loan structure per source: down payment ₹{money(rows[4][col])}, loan ₹{money(rows[5][col])}, tenure {txt(rows[6][col])}, EMI ₹{money(rows[7][col])}, processing fee {txt(rows[8][col])}. Registration ₹1,500 / exam ₹800 from UNIVERSITY sheet.")

    def parse_alliance(self, wb):
        rows = self.sheet(wb, "ALLIANCE ")
        for i, r in enumerate(rows[3:7], start=4):
            crs_raw = txt(r[0])
            if not crs_raw or crs_raw == "Program" or not money(r[3]):
                continue
            rec = self.fee("alliance-university", crs_raw, "Online", "ALLIANCE ", f"row {i}", registration_fee=money(r[1]), exam_fee=money(r[2]), exam_fee_basis="per_year",
                           tuition_total=money(r[3]), total_program_fee=money(r[4]),
                           notes="Scholarship matrix in source: 10% full-fee (on time), 10% AU alumni, 7.5% sports, 5% women / gallantry, 3% servicemen, 2% sibling — add-on conditions apply. International learner fees in USD not ingested.")
            if rec["exam_fee"] and self.univ_attr.get("alliance-university", {}).get("exam_fee_text") and money(self.univ_attr["alliance-university"]["exam_fee_text"]) != rec["exam_fee"]:
                self.flag("warning", "conflict", f"Alliance {crs_raw}: exam fee {rec['exam_fee']}/yr in ALLIANCE sheet vs {self.univ_attr['alliance-university']['exam_fee_text']} in UNIVERSITY sheet", sheet="ALLIANCE", row=i)
                rec["status"] = "conflict"; rec["flags"].append("exam_fee_conflict_between_sheets")

    def parse_vit(self, wb):
        rows = self.sheet(wb, "VIT")
        for col, crs_raw in ((1, "MBA"), (2, "M.Sc"), (3, "MCA")):
            self.fee("vit", crs_raw, "Online", "VIT", f"col {col}", total_program_fee=money(rows[3][col]), tuition_total=money(rows[3][col]), registration_fee=1200,
                     notes=f"Loan structure per source: down payment ₹{money(rows[4][col])}, loan ₹{money(rows[5][col])}, tenure {money(rows[6][col])} months, EMI ₹{rows[9][col]:.0f}, processing fee {txt(rows[10][col])}. Registration ₹1,200 from UNIVERSITY sheet; exam fee not stated.")

    def parse_adtu(self, wb):
        rows = self.sheet(wb, "ADTU")
        current, block = None, []
        def flush():
            if not current:
                return
            app = next((money(b[2]) for b in block if (txt(b[1]) or "").lower().startswith("application")), None)
            one = next((money(b[2]) for b in block if (txt(b[1]) or "").lower().startswith("one time")), None)
            sems = [money(b[2]) for b in block if txt(b[1]) and "fee" in txt(b[1]).lower() and "sem" in txt(b[1]).lower() or (txt(b[1]) and not re.match(r"^(Application|One time)", txt(b[1])) and money(b[2]))]
            total_row = next((money(b[1]) for b in block if not txt(b[1]) is None and money(b[1]) and b[2] is None), None)
            rec = self.fee("assam-down-town-university", current, "Online", "ADTU", "block", application_fee=app, admission_fee=one, installments=sems,
                           semesters=len(sems), tuition_total=total_row, total_program_fee=None,
                           notes="'One time Fees' (₹45,000/₹50,000) is ambiguous in source — could be an admission charge or a one-time payment option; stored as admission_fee pending confirmation. Source sheet is partly corrupted (some semester rows read 25.0 / 15.0 / 22.5 instead of full amounts; MCA row labels are garbled). Tuition total taken from the block subtotal row.")
            rec["status"] = "conflict"
            rec["flags"].append("source_sheet_corrupted_semester_amounts_need_verification")
        for r in rows[1:]:
            if txt(r[0]):
                flush(); current, block = txt(r[0]), [r]
            elif current and any(r):
                block.append(r)
        flush()

    def parse_christ(self, wb):
        rows = self.sheet(wb, "CRIST")
        i = 5
        while i < len(rows):
            r = rows[i]
            if txt(r[0]) and txt(r[0]).startswith("Other Fees"):
                break
            if txt(r[0]) and txt(r[1]):
                name = txt(r[0])
                m = re.match(r"^(BCom|BCA|MCA|MA|MSc)\s*(?:\(([^)]*)\))?\s*\((\d) Years?\)", name)
                crs_raw = m.group(1) if m else name
                spec = m.group(2) if m and m.group(2) else None
                yrs = int(m.group(3)) if m else None
                inst = [money(r[3])]
                j = i + 1
                while j < len(rows) and not txt(rows[j][0]) and txt(rows[j][3]):
                    inst.append(money(rows[j][3])); j += 1
                self.fee("christ-university", crs_raw, "Online", "CRIST", f"rows {i+1}–{j}", course_display=name, specialization=spec,
                         total_program_fee=money(r[1]), tuition_total=money(r[1]), installments=inst, duration_years=yrs,
                         application_fee=1500, admission_fee=5000, exam_fee=3000, exam_fee_basis="per_year",
                         notes="Programme fee excludes application (₹1,500 + GST), admission (₹5,000) and exam (₹3,000/yr) per source. Yearly instalments listed.")
                i = j
            else:
                i += 1

    def parse_dba(self, wb):
        rows = self.sheet(wb, "DBA")
        hdr = rows[0]
        names = {2: "golden-gate-university", 3: "rushford-business-school", 4: "ssbm-geneva", 5: "esgci-paris", 6: "eimt", 7: "birchwood-university"}
        def row(label):
            for r in rows:
                if txt(r[1]) and txt(r[1]).lower().startswith(label.lower()):
                    return r
            return [None] * 8
        prog, partner, fees, dur, elig, block, subsidy = row("Program Name"), row("Strategic Partner"), row("Course fees"), row("Duration"), row("Eligibility"), row("BLOCK Amount"), row("CV Subsidy")
        for c, slug in names.items():
            fee_text = txt(fees[c])
            nums = [money(x) for x in re.findall(r"[\d,]{5,}", fee_text or "")]
            rec = self.fee(slug, txt(prog[c]) or "DBA", "Online", "DBA", f"col {c}", course_display=txt(prog[c]) or "DBA",
                           total_program_fee=min(nums) if nums else None, duration_years=3,
                           notes=f"Source fee text: '{fee_text}'. Eligibility (source): {txt(elig[c])}. Blocking amount: {txt(block[c])}. Strategic partner: {txt(partner[c])}. Where two prices are given (with/without immersion) the lower 'without immersion' price is stored; both must be shown to students.")
            rec["flags"].append("fee_text_has_variants_needs_admin_split")
            rec["eligibility_text"] = txt(elig[c])
            self.internal["notes"].append(f"DBA {slug}: CV subsidy {txt(subsidy[c])}; strategic partner {txt(partner[c])}.")

    def parse_shoolini(self, wb):
        rows = self.sheet(wb, "SHOOLINI")
        if not any(any(txt(c) for c in r) for r in rows):
            self.flag("error", "missing", "SHOOLINI sheet is empty — partner is 'working' but no fee data exists. All Shoolini programs must show 'Contact us to confirm current fee'.", sheet="SHOOLINI")

    # ---- Mangalayatan workbook --------------------------------------------------------
    def parse_mu(self, wb):
        for sheet, mode in (("OL FEES ", "Online"), ("ODL FEES ", "Distance")):
            rows = self.sheet(wb, sheet)
            crs_raw = None
            level = None
            for i, r in enumerate(rows[2:], start=3):
                if not r[3]:
                    continue
                level = txt(r[1]) or level
                crs_raw = txt(r[2]) or crs_raw
                spec = txt(r[3])
                crs_c = crs_raw
                if crs_raw == "MBA PLUS":
                    crs_c, spec = "MBA Plus", spec.replace("MBA ", "")
                yr = [money(r[7]), money(r[8]), money(r[9])]
                yr = [y for y in yr if y]
                rec = self.fee("mangalayatan-university", crs_c, mode, sheet, f"row {i}", course_display=crs_raw, specialization=None if spec in {"GENERAL", "General", "DIPLOMA"} else spec,
                               registration_fee=money(r[4]), exam_fee=money(r[5]), exam_fee_basis="per_year", tuition_per_year=money(r[6]),
                               installments=yr, duration_years=len(yr), total_program_fee=money(r[10]),
                               notes="'Student Pay' columns only. Year-wise payable amounts stored as installments.")
                rec["source_file"] = MU_WB
                rec["level"] = level if level in {"UG", "PG"} else rec["level"]
                self.internal["center_sharing"].append(dict(
                    university_slug="mangalayatan-university", mode=mode, course=crs_c, specialization=spec, source_file=MU_WB, source_sheet=sheet, source_ref=f"row {i}",
                    student_pay_years=yr, center_pay_years=[money(r[11]), money(r[12]), money(r[13])],
                    semantics="Unconfirmed: 'Center Pay - Sharing' equals reg + exam + 50% of course fee in every row checked. Confirm with partner whether this is the amount remitted to the university or retained by the center."))
        for sheet, lvl, mode in (("UG DIPLOMA", "Diploma", "Online"), ("PG DIPLOMA", "PG Diploma", "Online")):
            rows = self.sheet(wb, sheet)
            for i, r in enumerate(rows[2:], start=3):
                if not r[0] or not money(r[1]):
                    continue
                name = txt(r[0])
                rec = self.fee("mangalayatan-university", lvl, mode, sheet, f"row {i}", course_display=name, registration_fee=money(r[1]), exam_fee=money(r[2]), exam_fee_basis="total",
                               tuition_total=money(r[3]), total_program_fee=money(r[4]), duration_years=1,
                               notes=(f"Lateral pathway per source: leads to {txt(r[6])}." if txt(r[6]) else None))
                rec["source_file"] = MU_WB
                self.internal["center_sharing"].append(dict(university_slug="mangalayatan-university", mode=mode, course=lvl, specialization=name, source_file=MU_WB, source_sheet=sheet, source_ref=f"row {i}",
                                                           student_pay_years=[money(r[4])], center_pay_years=[money(r[5])], semantics="see OL/ODL note"))

    # ---- partner PDF (payout data — INTERNAL) ---------------------------------------
    def parse_partner_pdf(self):
        """Values transcribed from Partner_Sharing_July_26__1_.pdf, Annexure 'A' (July-2026 intake)."""
        rows = [
            ("UU", "uttaranchal-university", "40%", "40%", "Yes"), ("CUOL", "chandigarh-university", "35%", "35%", "Yes"),
            ("SMU", "sikkim-manipal-university", "35%", "30% (PG) / 27% (UG)", "Yes"), ("MUJ", "manipal-university-jaipur", "35%", "30% (PG) / 27% (UG)", "Yes"),
            ("LPU", "lovely-professional-university", "45%", "45%", "Yes"), ("UPES", "upes", "35%", "35%", "Yes"),
            ("DPU", "dy-patil-university-pune", "45%", "45%", "Yes"), ("VIT", "vit", "27.5%", "27.5%", "Yes"),
            ("VU", "bennett-university", "27.5%", "27.5%", "Yes"), ("GLA", "gla-university", "50%", "50%", "Yes"),
            ("AMITY", "amity-university", "35%", "30%", "Yes"), ("Amrita", "amrita-vishwa-vidyapeetham", "30%", "30%", "Yes"),
            ("SU", "shoolini-university", "40%", "40%", "Yes"), ("KUK", "kurukshetra-university", "30%", "30%", "Yes"),
            ("Andhra", "andhra-university", "30%", "30%", "Yes"), ("SHARDA", "sharda-university", "40%", "40%", "ON HOLD"),
            ("VGU", "vivekananda-global-university", "50%", "50%", "Yes"), ("DYPATIL", "dy-patil-university-navi-mumbai", "30%", "30%", "Yes"),
            ("PU", "parul-university", "40%", "40%", "Yes"), ("NMIMS Normal", "nmims", "27.5%", "27.5%", "Yes"),
            ("NMIMS* (MBA WX)", "nmims", "17.5%", "17.5%", "Yes"), ("Galgotiya University", "galgotias-university", "50%", "50%", "Yes"),
            ("SRM", "srm-university", "40%", "40%", "Not available"), ("UPGRAD", "op-jindal-global-university", "25%", "25%", "Yes"),
            ("ADTU", "assam-down-town-university", "40%", "40%", "Yes"), ("Alliance", "alliance-university", "50%", "50%", "Yes"),
            ("Christ", "christ-university", "20%", "20%", "Yes"),
        ]
        for code, slug, share, loan_share, status in rows:
            self.internal["partner_payouts"].append(dict(
                channel="College Vidya (Blackboard ERP)", partner_short_code=code, university_slug=slug,
                program_scope="MBA (WX) only" if "WX" in code else "all programs",
                payout_share=share, payout_share_if_loan=loan_share, working_status=status,
                effective_intake=INTAKE, source_file=PARTNER_PDF, source_ref="Annexure A",
            ))
        # upGrad DBA partners inherit the UPGRAD line; EIMT/Birchwood are 'CV' strategic partner with no payout line
        for slug in ("golden-gate-university", "rushford-business-school", "ssbm-geneva", "esgci-paris"):
            self.internal["partner_payouts"].append(dict(channel="College Vidya (Blackboard ERP)", partner_short_code="UPGRAD", university_slug=slug, program_scope="DBA",
                                                         payout_share="25%", payout_share_if_loan="25%", working_status="Yes (inferred from UPGRAD line: 'OP Jindal university & DBA Programs')",
                                                         effective_intake=INTAKE, source_file=PARTNER_PDF, source_ref="Annexure A row 23"))
        for slug in ("eimt", "birchwood-university"):
            self.flag("warning", "missing", f"{slug}: listed in DBA sheet with strategic partner 'CV' but has no line in the partner annexure — commercial terms unknown.", sheet="DBA")
        self.internal["payment_workflow"] = dict(
            source_file=PARTNER_PDF,
            new_admission=["Provisional invoice within 7 days of payment receipt upload in ERP", "Status → 'Ready to Generate' on 6th of following month",
                           "Center updates invoice number in ERP", "Credited on/before 15th of every month", "Late invoices roll to next cycle"],
            re_registration=["Provisional invoice monthly on university re-registration confirmation in ERP", "Center updates invoice number once 'Ready to Generate'",
                             "Payment released within 15 days of invoice processing"],
            note="Fees and revenue sharing are subject to change per university guidelines (source).",
        )
        self.internal["notes"].append("Partner annexure is issued by College Vidya; contact number in the PDF is College Vidya's and must never be shown to students.")

    # ---- cross-source checks ----------------------------------------------------------
    def cross_checks(self):
        # short-code collisions
        self.flag("warning", "code_collision", "'VU' = Bennett University in the partner annexure, but 'VU' = Vignan's in the logo grid.")
        self.flag("warning", "code_collision", "'SU' = Shoolini in the partner annexure, but 'SU' = Sharda in the JULY 26 workbook (Shoolini is 'SCODE' there).")
        self.flag("warning", "code_collision", "'DPU' is used for both D.Y. Patil Pune (partner annexure) and D.Y. Patil Navi Mumbai (UNIVERSITY sheet).")
        # registration / exam fee conflicts between UNIVERSITY sheet and university sheets
        by_uni = defaultdict(list)
        for f in self.fees:
            by_uni[f["university_slug"]].append(f)
        for slug, attrs in self.univ_attr.items():
            reg_master = money(attrs.get("registration_fee_text"))
            regs = {f["registration_fee"] for f in by_uni.get(slug, []) if f["registration_fee"] is not None}
            if reg_master is not None and regs and reg_master not in regs and "/" not in (attrs.get("registration_fee_text") or "") and "+" not in (attrs.get("registration_fee_text") or ""):
                self.flag("warning", "conflict", f"{slug}: registration fee {reg_master} in UNIVERSITY sheet vs {sorted(regs)} in university sheet", sheet="UNIVERSITY")
                for f in by_uni[slug]:
                    if f["status"] == "under_review":
                        f["flags"].append("registration_fee_conflict_between_sheets")
        # explicit known conflicts
        self.flag("warning", "conflict", "Sharda: exam fee '3500/yr' (UNIVERSITY sheet) vs 7000 (SHARDA sheet, basis unstated). Partner is ON HOLD anyway.", sheet="SHARDA")
        self.flag("warning", "conflict", "Amrita: registration 500 / exam 2500-per-sem (UNIVERSITY sheet) vs registration 700 / exam 2750 (AMRITA sheet footer).", sheet="AMRITA")
        self.flag("warning", "conflict", "Parul: loan 'YES (Fibe)' in UNIVERSITY sheet vs 'NO LOAN APPLICABLE' in LOAN STRUCTURE sheet.", sheet="LOAN STRUCTURE")
        self.flag("warning", "conflict", "DPU Pune: exam fee '24200' in UNIVERSITY sheet has no basis and does not appear in the DPU (PUNE) sheet.", sheet="UNIVERSITY")
        self.flag("info", "naming", "Partner annexure says 'Dy Patil University Mumbai'; fee sheet and website say Navi Mumbai. Stored as D. Y. Patil University, Navi Mumbai.")
        self.flag("info", "naming", "Partner annexure says 'Manipal University' for MUJ; the fee sheet is titled Manipal University Online (Jaipur).")
        # programs without any fee record
        for key, p in self.programs.items():
            has_fee = any(f["university_slug"] == key[0] and f["course"] == key[1] and f["mode"] == key[2] and f["status"] != "missing" for f in self.fees)
            p["has_fee_data"] = has_fee
        # programs in fee sheets but not in master catalogue
        for key, p in self.programs.items():
            if not p["in_master_catalogue"] and key[0] not in {"mangalayatan-university", "golden-gate-university", "rushford-business-school", "ssbm-geneva", "esgci-paris", "eimt", "birchwood-university"}:
                self.flag("info", "catalogue_gap", f"{key[0]} / {key[1]} ({key[2]}) has a fee sheet entry but no row in the ALL IN ONE master catalogue.")
        # universities in logo grid but nowhere in the data
        for name in ("Jain University (JU)", "Manipal Academy of Higher Education (MAHE)", "Vignan's (VU)", "Subharti (SVSU, Distance)"):
            self.flag("warning", "logo_without_data", f"{name}: appears in the logo grid but has no partner line and no fee sheet. Do not display.")
        self.flag("error", "cycle", f"Every record is tagged effective_intake={INTAKE} ({INTAKE_LABEL}). Today is {date.today().isoformat()}. Verify each fee against the current admission cycle before publishing.")
        self.flag("warning", "missing", "Eligibility criteria are not present in any source file (except DBA). Program pages must show 'Contact us to confirm eligibility' until admin enters verified criteria.")
        self.flag("warning", "missing", "Duration is only derivable where a source gives semesters/years (LPU, Galgotias, DPU Pune, Christ, NMIMS, Andhra, Mangalayatan, DBA). All other programs have duration = null.")
        self.flag("info", "scope", "ALL IN ONE master catalogue is 100% 'Online'. Distance-mode programs exist only in the Mangalayatan ODL sheet.")

    # ---- output ---------------------------------------------------------------------
    def build_universities(self):
        payout_status = {p["university_slug"]: p["working_status"] for p in self.internal["partner_payouts"] if p["program_scope"] != "MBA (WX) only"}
        out = []
        for u in UNIVERSITIES:
            slug = u["slug"]
            progs = [p for k, p in self.programs.items() if k[0] == slug]
            modes = sorted({p["mode"] for p in progs})
            fees_ok = [f for f in self.fees if f["university_slug"] == slug and f["status"] in {"under_review"}]
            ws = payout_status.get(slug)
            if ws == "ON HOLD":
                status = "on_hold"
            elif ws == "Not available":
                status = "not_available"
            elif not progs and not fees_ok:
                status = "no_data"
            elif not fees_ok:
                status = "no_fee_data"
            else:
                status = "active"
            attrs = self.univ_attr.get(slug, {})
            fin = next((f for f in self.financing if f["university_slug"] == slug), None)
            starting = min([x for f in fees_ok if f["level"] in {"UG", "PG"} and f["plan_type"] == "standard"
                            for x in (f["total_program_fee"] or f["full_plan_fee"] or f["tuition_total"],) if x], default=None)
            out.append(dict(
                slug=slug, name=u["name"], location=u["location"], website=u["website"] or attrs.get("website_from_sheet"),
                modes=modes or ["Online"], levels=sorted({p["level"] for p in progs}), course_families=sorted({p["course"] for p in progs}),
                program_count=len(progs), status=status, publishable=status == "active",
                registration_fee_text=attrs.get("registration_fee_text"), exam_fee_text=attrs.get("exam_fee_text"),
                financing_available=(False if (fin and fin["no_loan"]) else attrs.get("loan_available")),
                financing_partners=None if (fin and fin["no_loan"]) else (fin["loan_partners"] if fin else attrs.get("loan_partners_text")),
                starting_total_fee=starting, starting_fee_verified=False,
                logo_present_in_grid=slug not in {"mangalayatan-university", "op-jindal-global-university", "golden-gate-university", "rushford-business-school", "ssbm-geneva", "esgci-paris"},
                effective_intake=INTAKE, last_source_update="2026-07", verification_status="under_review",
            ))
        return out

    def write(self):
        pub = self.out / "public"
        internal = self.out / "internal"
        pub.mkdir(parents=True, exist_ok=True); internal.mkdir(parents=True, exist_ok=True)
        universities = self.build_universities()
        programs = []
        for k, p in sorted(self.programs.items()):
            q = dict(p); q["sources"] = sorted(q["sources"]); q["slug"] = f"{k[0]}/{re.sub(r'[^a-z0-9]+', '-', k[1].lower()).strip('-')}-{k[2].lower()}"
            programs.append(q)
        fees = []
        for n, f in enumerate(self.fees, start=1):
            g = dict(f); g["id"] = f"FEE-{INTAKE}-{n:04d}"; fees.append(g)
        (pub / "universities.json").write_text(json.dumps(universities, indent=2, ensure_ascii=False))
        (pub / "programs.json").write_text(json.dumps(programs, indent=2, ensure_ascii=False))
        (pub / "fees.json").write_text(json.dumps(fees, indent=2, ensure_ascii=False))
        (pub / "financing.json").write_text(json.dumps(self.financing, indent=2, ensure_ascii=False))
        (internal / "partner_commercials.json").write_text(json.dumps(self.internal, indent=2, ensure_ascii=False))
        (internal / "README.md").write_text("# CONFIDENTIAL — internal partner commercials\n\nPayout shares, center sharing and subvention data. Never copy into `data/public/`, the frontend bundle, or any public API. Loaded only into the `internal` DB schema by `db/seed.ts`.\n")
        report = self.report(universities, programs, fees)
        (self.out / "validation_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
        (self.out.parent / "DATA_VALIDATION_REPORT.md").write_text(self.report_md(report, universities, programs, fees))
        return report

    def report(self, universities, programs, fees):
        status_counts = Counter(f["status"] for f in fees)
        flagged = [f for f in fees if f["flags"]]
        return dict(
            generated_on=date.today().isoformat(), effective_intake=INTAKE,
            sources=[FEE_WB, MU_WB, PARTNER_PDF, LOGO_IMG],
            counts=dict(universities_total=len(universities), universities_by_status=dict(Counter(u["status"] for u in universities)),
                        programs=len(programs), programs_with_fee_data=sum(1 for p in programs if p["has_fee_data"]),
                        programs_without_fee_data=sum(1 for p in programs if not p["has_fee_data"]),
                        specializations=sum(len(p["specializations"]) for p in programs),
                        fee_records=len(fees), fee_records_by_status=dict(status_counts), fee_records_flagged=len(flagged),
                        fee_rows_by_sheet=dict(self.rows_by_sheet), findings=len(self.findings),
                        findings_by_severity=dict(Counter(x["severity"] for x in self.findings))),
            findings=self.findings,
            flagged_fee_ids=[f["id"] for f in flagged],
        )

    def report_md(self, rep, universities, programs, fees):
        c = rep["counts"]
        L = []
        L.append(f"# Data Validation Report — DegreeComplete.in\n\nGenerated {rep['generated_on']} from the July-2026 source files. **No record is published.** Every fee starts as `under_review` and needs an administrator's verification in the admin panel before it appears publicly.\n")
        L.append("## Sources\n" + "\n".join(f"- `{s}`" for s in rep["sources"]) + "\n")
        L.append("## Counts\n")
        L.append(f"| Metric | Value |\n|---|---|\n| Universities in dataset | {c['universities_total']} |\n| — by status | {', '.join(f'{k}: {v}' for k, v in c['universities_by_status'].items())} |\n| Programs (university × course × mode) | {c['programs']} |\n| — with at least one usable fee record | {c['programs_with_fee_data']} |\n| — with no fee data (show *Contact us to confirm current fee*) | {c['programs_without_fee_data']} |\n| Specializations | {c['specializations']} |\n| Fee records | {c['fee_records']} |\n| — by status | {', '.join(f'{k}: {v}' for k, v in c['fee_records_by_status'].items())} |\n| — carrying at least one flag | {c['fee_records_flagged']} |\n| Findings | {c['findings']} ({', '.join(f'{k}: {v}' for k, v in c['findings_by_severity'].items())}) |\n")
        L.append("## Universities\n\n| University | Status | Modes | Programs | Fee rows | Publishable now |\n|---|---|---|---|---|---|")
        for u in universities:
            n = sum(1 for f in fees if f["university_slug"] == u["slug"])
            L.append(f"| {u['name']} | {u['status']} | {', '.join(u['modes'])} | {u['program_count']} | {n} | {'after admin verification' if u['publishable'] else 'no'} |")
        L.append("\n## Findings requiring action\n")
        for sev in ("error", "warning", "info"):
            items = [x for x in rep["findings"] if x["severity"] == sev]
            if not items:
                continue
            L.append(f"### {sev.upper()} ({len(items)})\n")
            for x in items:
                loc = f" _(sheet: {x['sheet']}{', row ' + str(x['row']) if x.get('row') else ''})_" if x.get("sheet") else ""
                L.append(f"- **{x['category']}** — {x['message']}{loc}")
            L.append("")
        L.append("## Fee records that need admin attention\n\n| Fee ID | University | Course | Plan | Status | Flags |\n|---|---|---|---|---|---|")
        for f in fees:
            if f["flags"] or f["status"] != "under_review":
                L.append(f"| {f['id']} | {f['university_slug']} | {f['course_display']}{' / ' + f['specialization'] if f['specialization'] else ''} | {f['plan_type']} | {f['status']} | {', '.join(f['flags']) or '—'} |")
        L.append("\n## Rules applied\n\n- Nothing was invented. Where a source gives no number, the field is `null` and the UI shows *Contact us to confirm current fee*.\n- Conflicting values between sheets are recorded as findings and the affected records are flagged; an administrator chooses the student-facing value.\n- Internal payout, center-sharing and subvention data are written **only** to `data/internal/` and load **only** into the `internal` database schema.\n- Duplicate rows in the sources were kept once and logged.\n- The College Vidya contact number in the partner PDF is not stored anywhere in public data.\n")
        return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--uploads", default="/mnt/user-data/uploads")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parents[1]))
    a = ap.parse_args()
    up, out = Path(a.uploads), Path(a.out)
    ing = Ingest(up, out)
    wb = load_workbook(up / FEE_WB, read_only=True, data_only=True)
    ing.parse_university_sheet(wb)
    ing.parse_all_in_one(wb)
    ing.parse_loan_structure(wb)
    ing.parse_subvention(wb)
    for fn in (ing.parse_smu, ing.parse_muj, ing.parse_uu, ing.parse_sharda, ing.parse_kuk, ing.parse_lpu, ing.parse_dpu_pune, ing.parse_vgu,
               ing.parse_dpu_nm, ing.parse_gla, ing.parse_upes, ing.parse_amrita, ing.parse_andhra, ing.parse_nmims, ing.parse_parul,
               ing.parse_galgotias, ing.parse_amity, ing.parse_cu, ing.parse_bennett, ing.parse_alliance, ing.parse_vit, ing.parse_adtu,
               ing.parse_christ, ing.parse_dba, ing.parse_shoolini):
        fn(wb)
    wb.close()
    mu = load_workbook(up / MU_WB, read_only=True, data_only=True)
    ing.parse_mu(mu)
    mu.close()
    ing.parse_partner_pdf()
    ing.cross_checks()
    rep = ing.write()
    print(json.dumps(rep["counts"], indent=2))


if __name__ == "__main__":
    main()
