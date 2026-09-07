#!/usr/bin/env python3
"""Generates:
  marketing/DegreeComplete_90Day_Strategy.md       — master summary + full day-by-day creative sheets + creative library
  marketing/DegreeComplete_90Day_Calendar.xlsx     — execution workbook (calendar, budget scenarios, KPI tracker, library, stories)
"""
import json, re
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment
from calendar_data import DAYS, MASTER_PROMPT, GEO_PRIMARY

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
progs = json.loads((ROOT / "data/public/programs.json").read_text())
unis = json.loads((ROOT / "data/public/universities.json").read_text())
fees = json.loads((ROOT / "data/public/fees.json").read_text())
active = {u["slug"]: u for u in unis if u["status"] == "active"}

def fee_range(course_pred):
    vals = []
    for p in progs:
        if p["university_slug"] in active and course_pred(p):
            for fid in p["fee_ids"]:
                f = next(x for x in fees if x["id"] == fid)
                if f["plan_type"] == "standard" and f["status"] == "under_review" and not f["flags"]:
                    v = f["total_program_fee"] or f["full_plan_fee"] or f["tuition_total"]
                    if v: vals.append(v)
    return (min(vals), max(vals), len(vals)) if vals else (None, None, 0)

def inr(n): return f"₹{n:,}" if n else "—"

# ---------------------------------------------------------------------------------------------
# University tiers (student-fit criteria only; payout data is not used or shown)
# ---------------------------------------------------------------------------------------------
TIERS = [
    ("A", "nmims", "Deemed brand (Mumbai), NAAC/AACSB profile, MBA/BBA/B.Com; local trust in primary geography", "MBA, BBA, B.Com, MBA (WX)"),
    ("A", "manipal-university-jaipur", "Strong national online brand; MBA, MCA, BBA, BCA, B.Com, MA, M.Sc; no-cost EMI plans", "MBA, MCA, BCA, BBA"),
    ("A", "amity-university", "Widest catalogue (37 rows), UG+PG+integrated; loan/discount plans; strong recall", "MBA, BBA, BCA, MCA, BA"),
    ("A", "lovely-professional-university", "Broad UG/PG/diploma range, student-grant pricing, no-cost EMI", "MBA, MCA, BBA, BCA, BA"),
    ("A", "chandigarh-university", "15 programs incl. analytics/AI variants; early-bird pricing; strong UG demand", "BBA, BCA, MBA, MCA"),
    ("A", "dy-patil-university-navi-mumbai", "Maharashtra-local; BBA/MBA/BCA/MCA with 'Plus' variants; loan partners", "MBA, BBA, BCA, MCA (Mumbai/Navi Mumbai/Thane)"),
    ("A", "dy-patil-university-pune", "Maharashtra-local; MBA incl. working-professional track; scholarships on full payment", "MBA, MCA, BBA (Pune/Nashik/Sambhajinagar)"),
    ("A", "sikkim-manipal-university", "Manipal-group value option; MBA ₹1.2L, MCA, BBA, BA, B.Com, MA; no-cost EMI", "MBA (value), MCA, BBA"),
    ("B", "upes", "39 sector MBAs and PG certificates (energy, logistics, infra) — niche, higher fee", "MBA (sector), MCA, PG certificates"),
    ("B", "amrita-vishwa-vidyapeetham", "20 programs incl. ACCA/AI variants; strong academic brand; loan on full fee only", "MBA, BCA, BBA, MCA"),
    ("B", "vit", "Tech brand; MBA/MCA/M.Sc DS with EMI structure", "MCA, M.Sc Data Science, MBA"),
    ("B", "bennett-university", "Times Group brand; MBA/BBA with EMI", "MBA, BBA (NCR)"),
    ("B", "christ-university", "Bengaluru deemed brand; B.Com/BCA/MCA/MA/M.Sc; higher fees", "MCA, M.Sc, B.Com (South India)"),
    ("B", "galgotias-university", "Value MBA/MCA (₹80–85k all-inclusive per source)", "MBA (value), MCA, BBA, BCA"),
    ("B", "alliance-university", "MBA/BBA/B.Com with on-time and category scholarships", "MBA, BBA (Bengaluru)"),
    ("B", "vivekananda-global-university", "Value UG/PG with scholarship pricing", "BBA, BCA, MBA, MCA (value)"),
    ("B", "gla-university", "Value UG/PG; low registration/alumni model", "BBA, BCA, MBA, MCA (value)"),
    ("B", "parul-university", "20 MBA specializations, low UG fees; loan status conflict in source — clarify", "MBA (specializations), BBA, BCA, BA"),
    ("B", "uttaranchal-university", "Scholarship pricing, MBA specializations, MBA Executive", "MBA, BBA, BCA, MCA"),
    ("C", "kurukshetra-university", "State university, low fees, no loan; diplomas/certificates", "BA, B.Com, MBA (govt-university seekers)"),
    ("C", "andhra-university", "State university, lowest MBA/MCA fees, no loan", "MBA, MCA, MA (value)"),
    ("C", "mangalayatan-university", "Only DISTANCE (ODL) option + lowest fees; jurisdiction rules to check", "Distance BA/B.Com/MBA, diplomas"),
    ("C", "assam-down-town-university", "Fee sheet corrupted in source — verify before marketing", "BBA, MBA, BCA, MCA (after verification)"),
    ("C", "shoolini-university", "Eligibility present but fees not verified in source", "MBA, MCA (after fee verification)"),
    ("C", "golden-gate-university", "DBA via upGrad — executive/doctoral niche", "DBA (executives 30–45)"),
    ("C", "op-jindal-global-university", "Executive programs via upGrad — no fee data", "Executive (after data)"),
    ("Exclude", "sharda-university", "Partner ON HOLD in source — do not market", "—"),
    ("Exclude", "srm-university", "Not available in source — do not market", "—"),
]

def uni_name(slug): return next((u["name"] for u in unis if u["slug"] == slug), slug)

# ---------------------------------------------------------------------------------------------
# Creative library
# ---------------------------------------------------------------------------------------------
LIB = {
"20 MBA hooks": [
 "Job के साथ MBA — बिना career रोके.", "Graduate हो, job है — अब MBA, बिना entrance exam.", "आपका अगला promotion एक degree दूर हो सकता है.", "Online MBA ₹62,000 से — university के हिसाब से.",
 "MBA करना है पर resign नहीं कर सकते?", "Finance, Marketing, HR, Analytics — आपका specialization?", "Online MBA लेने से पहले ये 5 mistakes मत करना.", "20+ universities का Online MBA — एक page पर compare.",
 "3+ years experience? Executive MBA options भी हैं.", "MBA specialization कैसे चुनें? 4 सवाल.", "Online MBA vs Distance MBA — असली फर्क.", "Recorded classes, online exams — यही है Online MBA.",
 "Weekend में MBA, weekdays में job.", "MBA fees में क्या included है? (और क्या नहीं)", "Dual specialization MBA — किन universities में?", "Non-commerce graduate हो? MBA फिर भी possible.",
 "MBA के 2 साल — realistic weekly schedule.", "No-cost EMI वाले MBA programs.", "CV पर MBA — 24 महीने में.", "Confused between two universities? Compare, then decide."],
"20 Graduation hooks": [
 "Graduation बीच में छूट गई? अब घर से complete करो.", "12th के बाद job कर ली, degree रह गई?", "Graduation अधूरी रह गई थी — अब नहीं.", "Second chance at graduation — from home.",
 "3 reasons your incomplete graduation is holding your career back.", "12th में कम marks? फिर भी graduation possible है.", "Gap 5 साल का है? Eligibility check करो.", "Graduation complete करने की fees — ₹34,000 से शुरू.",
 "Job के साथ BA/B.Com — 3 साल, घर से.", "Promotion के लिए degree चाहिए? यहाँ से शुरू करो.", "Government exam की eligibility — graduation पहले.", "Graduation Completion Guide — free.",
 "'Baad mein karenge' — सबसे महंगी decision.", "Family को time भी दो, degree भी लो.", "Distance BA ₹34,000 में — कैसे?", "MBA करना है? पहले graduation complete.",
 "Shop चलाते हो? Graduation online complete करो.", "Night shift में हो? Recorded lectures आपके time पर.", "Degree नहीं, तो offers भी नहीं — बदलो इसे.", "आपकी marksheet का इंतज़ार खत्म."],
"15 BBA hooks": [
 "12th के बाद graduation छूट गई? Online BBA घर से.", "College नहीं जा सकते? BBA फिर भी हो सकता है.", "Business की foundation — BBA, घर से.", "Online BBA fees: ₹64,000 से ₹1.5 लाख — फर्क क्या है?",
 "BBA vs BCA — कौन सा आपके लिए?", "Family business + BBA = दोनों साथ.", "BBA के बाद MBA — पूरा roadmap.", "किसी भी stream से BBA — यहाँ eligibility.",
 "Online BBA में specializations भी होते हैं.", "12th pass हो? आज eligibility check करो.", "BBA in 3 years, exams online.", "Parents के लिए: Online BBA कितना safe है?",
 "BBA के 6 semesters — क्या पढ़ोगे?", "No entrance exam BBA — most universities.", "BBA with Digital Marketing / Analytics — कहाँ?"],
"15 BCA hooks": [
 "IT career चाहिए? 12th के बाद Online BCA.", "12th के बाद IT career — Online BCA (AI / Data / Cyber).", "Coding सीखनी है और degree भी? BCA.", "BCA के लिए Maths ज़रूरी है? (यहाँ जवाब)",
 "Online BCA specializations by university.", "BCA के बाद MCA — tech roadmap.", "Arts/Commerce से BCA हो सकता है?", "BCA में AI & Data Science specialization — कहाँ?",
 "Cyber Security में career — BCA से शुरू.", "BCA vs B.Sc CS — फर्क समझो.", "BCA 3 साल, exams online, projects real.", "12th में Maths था? BCA आपके लिए है.",
 "Cloud Computing सीखो degree के साथ.", "BCA fees compare — 20+ universities.", "Full-stack developer बनना है? पहले BCA."],
"15 MCA hooks": [
 "Graduate से tech professional — Online MCA.", "Non-IT graduate होकर tech में आना है? पहले ये check करो.", "Career switch to IT — MCA eligibility 2 minute में.", "Online MCA: AI/ML, Data Science, Cyber — कहाँ क्या?",
 "Graduate से AI/Data professional — Online MCA.", "MCA के लिए Maths — 10+2 या graduation में.", "BCA किया? MCA अगला step.", "Job के साथ MCA — 2 साल.",
 "B.Com graduate, IT में जाना है? MCA path.", "MCA fees ₹76,000 से — verify करके.", "Bridge course क्या है? MCA वालों के लिए.", "AI & ML specialization वाला MCA.",
 "Cyber Security & Forensics MCA — किन universities में?", "MCA या PG certificate — किसके लिए क्या?", "Tech upgrade without quitting your job."],
"10 BA hooks": [
 "Online BA — किसी भी stream से, घर से.", "BA in English, Economics, Political Science — online.", "UPSC की तैयारी + BA साथ में.", "Distance BA ₹34,000 में — eligibility?",
 "BA के बाद MA/MBA — रास्ता खुला.", "Teaching में जाना है? BA से शुरू.", "BA JMC — media career online.", "12th pass से graduate — BA online.",
 "BA 3 साल, max 6 — अपनी speed से.", "Housewife हो? BA online complete करो."],
"10 B.Com hooks": [
 "Online B.Com — accounts, finance, banking careers.", "B.Com (Hons) online — किन universities में?", "Job के साथ B.Com — CA/CS की eligibility भी.", "B.Com with ACCA — कहाँ available?",
 "Distance B.Com ₹34,000 से.", "B.Com के बाद M.Com/MBA.", "Bank job के लिए graduation — B.Com online.", "Accounting पढ़ो, degree लो, job रखो.",
 "B.Com specializations: Fintech, Analytics, Taxation.", "12th commerce के बाद online B.Com."],
"10 General education hooks": [
 "Online और Distance में actual difference क्या है?", "Online degree लेने से पहले ये 3 चीज़ें verify करो.", "Fake university से कैसे बचें? 4 red flags.", "Fees में क्या-क्या included है?",
 "Course चुनने से पहले ये 5 चीज़ें check करो.", "Kitna time milta hai degree complete करने के लिए? (UGC rule)", "Documents की ये 4 galtiyan admission रोक देती हैं.", "Counsellor से पहली call में क्या पूछें?",
 "Enquiry से admission तक — 8 steps.", "Ek platform, 26+ universities, zero confusion."],
"20 CTA variations": ["Check My Eligibility", "Get Fee Details", "Find My Course", "Get Free Course Guidance", "Explore Universities", "Compare Universities", "View Programs", "Explore Courses",
 "Apply Now", "Start Your Application", "Talk to an Education Expert", "Speak with an Education Advisor", "Call an Education Expert", "WhatsApp for Guidance", "Get a Call Back",
 "Save this post", "Share with a student", "Comment MBA", "Complete My Eligibility Check", "Upload Documents"],
"20 Reel hooks": ["3 reasons your graduation may be holding back your career.", "Online MBA लेने से पहले ये 5 चीजें check करें.", "BCA vs BBA — कौन सा आपके लिए बेहतर?", "Online और Distance में actual difference क्या है?",
 "University choose करने से पहले ये mistake मत करना.", "Ek enquiry ke baad actually kya hota hai?", "Job के साथ पढ़ाई — एक हफ्ते का realistic schedule.", "Fees में क्या-क्या included है?",
 "Counsellor से पहली call में क्या पूछें?", "Enquiry से admission तक — 8 steps, कितना time?", "Documents की ये 4 galtiyan.", "'Main eligible hoon ya nahi?' — 2 minute में जवाब.",
 "MBA करना है पर resign नहीं कर सकते?", "Non-IT graduate होकर tech में आना है?", "MBA specialization कैसे चुनें? 4 सवाल.", "5 सवाल → आपके eligible programs.",
 "'Baad mein karenge' — सबसे महंगी decision.", "Graduation अधूरी रह गई थी — अब नहीं.", "आपका अगला promotion एक degree दूर.", "Second chance at graduation — from home."],
"20 Carousel headline ideas": ["5 Things to Check Before Taking an Online Degree", "Online MBA vs Distance MBA", "BBA vs BCA", "Graduation Complete करने के 5 फायदे", "University Compare करने का सही तरीका",
 "Online MBA: कौन कर सकता है, कितना time, क्या मिलेगा?", "Online BBA after 12th — पूरा picture", "Online BCA: eligibility, specializations, career", "Online MCA — graduate से tech professional", "MA, M.Com, M.Sc online — किसके लिए कौन सा?",
 "Myth vs Fact: Online degree की value", "Admission के लिए कौन से documents चाहिए?", "Online MBA के लिए 6 तरह की university options", "Kitna time milta hai degree complete karne ke liye?", "University Selection Checklist (10 points)",
 "MBA Specialization Guide", "BCA vs BBA Guide", "Graduation Completion Guide", "Fee comparison: BBA by university", "Enquiry से LMS login तक — student journey"],
"20 WhatsApp CTA ideas": ["Message MBA", "Message GRADUATION", "Message BCA", "Message BBA", "Message MCA", "Message FEES with your university + course", "Message ELIGIBLE with your 12th %", "Message MODE for Online vs Distance guide",
 "Message COMPARE", "Message DOCS for the checklist", "Message EMI with your course", "Message SPECIALIZATION", "Message CHECKLIST", "Message UPGRADE with your years of experience", "Message START",
 "Message CALL for a call back", "Message VERIFY with the university name", "Message 12TH", "Message EXEC", "Message ASK"],
}

# ---------------------------------------------------------------------------------------------
# Markdown document
# ---------------------------------------------------------------------------------------------
def md():
    mba = fee_range(lambda p: p["course"] == "MBA"); bba = fee_range(lambda p: p["course"] == "BBA"); bca = fee_range(lambda p: p["course"] == "BCA")
    mca = fee_range(lambda p: p["course"] == "MCA"); ba = fee_range(lambda p: p["course"] in ("BA", "B.Com")); 
    nMBA = sum(1 for p in progs if p["university_slug"] in active and p["course"] == "MBA")
    L = []
    L.append("# DegreeComplete.in — 90-Day Instagram & Performance Marketing System\n")
    L.append("**Mumbai Institute for Online & Distance Learning · DegreeComplete.in™ · “Complete Your Education. Complete Your Future.”**\n\nPrepared 03 Sep 2026. Companion workbook: `DegreeComplete_90Day_Calendar.xlsx` (day-by-day execution sheet, budget scenarios, KPI tracker).\n")
    L.append("> **How to read this document.** Every fact is tagged: **SOURCE** = your July-2026 fee sheets / admission master (July-2026 intake — verify current before quoting in an ad), **MARKET** = general market knowledge to be validated with your own campaign/CRM data, **ASSUMPTION** = a starting number you should overwrite. No student numbers, testimonials, rankings, placement or salary figures are used anywhere, because none exist in your data yet.\n")
    # ---- master summary
    L.append("## 1. Master summary\n")
    L.append("### Course priority (SOURCE inventory + MARKET demand)\n")
    L.append(f"| Course | Marketing weight | Why | Published programs (SOURCE) | Verified total-fee range (SOURCE, standard plan) |\n|---|---|---|---|---|\n"
             f"| MBA | 30% | Highest-intent PG search category (MARKET); {nMBA} MBA rows across active partners | {nMBA} | {inr(mba[0])} – {inr(mba[1])} ({mba[2]} rows) |\n"
             f"| BBA | 15% | UG lead volume; 12th-pass segment | {sum(1 for p in progs if p['university_slug'] in active and p['course']=='BBA')} | {inr(bba[0])} – {inr(bba[1])} |\n"
             f"| BCA | 15% | Tech-career UG; AI/Data/Cyber specializations available | {sum(1 for p in progs if p['university_slug'] in active and p['course']=='BCA')} | {inr(bca[0])} – {inr(bca[1])} |\n"
             f"| MCA | 12% | Graduate → tech upgrade; Maths filter narrows leads (good for quality) | {sum(1 for p in progs if p['university_slug'] in active and p['course']=='MCA')} | {inr(mca[0])} – {inr(mca[1])} |\n"
             f"| BA / B.Com | 16% (10 + 6) | Graduation-completion segment (Segment A/D) | {sum(1 for p in progs if p['university_slug'] in active and p['course'] in ('BA','B.Com'))} | {inr(ba[0])} – {inr(ba[1])} |\n"
             f"| B.Sc | 2% | Only Mangalayatan ODL B.Sc in source — treat as niche until more inventory | 1 | — |\n"
             f"| MA / M.Com / M.Sc | 6% | Teaching/UPSC/research audiences; low CPL potential (MARKET) | {sum(1 for p in progs if p['university_slug'] in active and p['course'] in ('MA','M.Com','M.Sc'))} | — |\n"
             f"| Diploma / Certificate / Executive / DBA | 4% | Niche, higher-ticket or lateral-entry; do not fund until lead data supports | {sum(1 for p in progs if p['university_slug'] in active and p['level'] in ('Diploma','PG Diploma','Certificate','PG Certificate','Executive','Doctoral'))} | — |\n")
    L.append("B.Sc is moved from 4% to 2% because the source has only one B.Sc program; the 2% goes to BA/B.Com where inventory and the graduation-completion segment are strong. **Re-set these weights on Day 30 from CRM data (Section 3).**\n")
    L.append("### University priority (student-fit criteria only)\n\nTiering uses course availability, fee attractiveness, brand strength, breadth, eligibility, Maharashtra relevance and source status. Payout data was not used and must never influence student-facing content.\n\n| Tier | University | Reason | Lead with |\n|---|---|---|---|")
    for t, s, why, lead in TIERS: L.append(f"| {t} | {uni_name(s)} | {why} | {lead} |")
    L.append("\nA-tier universities appear in comparison content and lead-gen creatives; B-tier appear in specialization/value posts; C-tier only when a student's constraint (budget, distance mode, state-university preference) makes them the right fit. Sharda and SRM are excluded until their status changes.\n")
    L.append("### Audience priority\n\n| Segment | Age (ads) | Courses | Core message | Weight |\n|---|---|---|---|---|\n| A · 12th pass, not in college | 18–24 | BBA, BCA, BA, B.Com | “Your education does not have to remain incomplete.” | 30% |\n| B · Graduates | 21–34 | MBA, MCA, MA, M.Com, M.Sc | “Upgrade your qualification without putting your career on hold.” | 35% |\n| C · Working professionals | 24–40 | MBA, MCA, Executive, PG certificates | Flexibility + career growth | 25% |\n| D · Academic gap | 21–34 | BA, B.Com, BBA | “Check your eligibility. Get guidance based on your academic history.” | 10% (overlaps A/C) |\n\nNo targeting below 18. Parents (35–55) are a secondary audience for BBA/BCA awareness only.\n")
    L.append(f"### Geography\n\n**Primary (Days 1–30):** {GEO_PRIMARY}.  \n**Expansion test (Days 31–90, Online programs only):** Delhi NCR, Bengaluru, Hyderabad, Ahmedabad, Kolkata, Jaipur, Lucknow, Patna — added one at a time, kept only where cost per qualified lead is within 1.3× of Maharashtra.  \n**Distance (ODL) programs:** Mangalayatan is the only ODL partner in source; territorial jurisdiction must be confirmed before any geo is switched on. No blanket geographic claims in creatives.\n")
    L.append("### Age segmentation (separate ad sets)\n\nUG (BBA/BCA/BA/B.Com): 18–24 · PG (MBA/MCA/MA/M.Com/M.Sc): 21–34 · Working professionals (MBA/MCA/Executive): 24–40. Test bands 18–24, 21–30, 25–34, 30–40; never merge them in one ad set.\n")
    o = [x for x in DAYS if x["mode"] == "ORGANIC"]; pa = [x for x in DAYS if x["mode"] == "PERFORMANCE AD"]
    reels = sum(1 for x in DAYS if "Reel" in x["fmt"]); cars = sum(1 for x in DAYS if "Carousel" in x["fmt"]); stat = sum(1 for x in DAYS if "Static" in x["fmt"]); sto = sum(1 for x in DAYS if "Story" in x["fmt"])
    L.append(f"### Content mix (actual, from the calendar)\n\n60 organic days + 30 performance-ad days. Formats: {reels} Reel-format days, {cars} carousels, {stat} static/graphic, {sto} story sets, plus lead-ad video/static variants. Reels are weighted slightly above the 25 target because the first-7-day test and the retargeting phase both need vertical video.\n")
    L.append("### Paid campaign mix (30 creatives)\n\n| Bucket | Creatives | Days | Meta objective |\n|---|---|---|---|\n| Awareness / video view | 6 | 61, 63, 68, 72, 82, 86 | Video views (ThruPlay) |\n| Engagement | 4 | 65, 70, 79, 84 | Engagement |\n| Traffic | 4 | 67, 71, 74, 83 | Traffic (landing page views) |\n| Lead generation | 10 | 4, 5, 6, 7 (test week) + 62, 64, 66, 69, 73, 75 | Leads (instant form) |\n| Retargeting | 3 | 76, 77, 80 | Leads / Traffic on custom audiences |\n| Conversion / application | 3 | 78, 81, 85 | Conversions on CRM audiences |\n")
    L.append("### Budget allocation (percentages; scenarios in the workbook)\n\nNo single budget is assumed. The workbook's **Budget** sheet has LOW / MEDIUM / HIGH monthly scenarios (ASSUMPTION cells you overwrite) and computes the split.\n\n| Window | Awareness | Lead gen | Retargeting | Conversion | Note |\n|---|---|---|---|---|---|\n| Days 1–7 (test) | 10% | 90% | 0% | 0% | Four lead creatives, equal spend, Maharashtra only |\n| Days 8–14 | 15% | 75% | 10% | 0% | Kill the worst course/creative, keep three; start engager retargeting |\n| Days 15–30 | 20% | 60% | 15% | 5% | Add traffic to course pages; first conversion audience from CRM |\n| Days 31–60 (mostly organic) | 30% | 45% | 15% | 10% | Small always-on lead budget; awareness builds retargeting pools |\n| Days 61–90 (scale) | 20% | 50% | 15% | 15% | Scale winners by course; expansion geos one at a time |\n\nAfter Day 7 shift budget toward the course with the lowest cost per **qualified** lead; after Day 14 toward the course with the best lead→counselling rate; after Day 30 toward the best cost per application. Never scale a cheap-lead course whose qualified rate is below 40%.\n")
    L.append("### Funnel\n\nCOLD → AWARENESS (video) → ENGAGEMENT (comments/saves) → WEBSITE (course page) → ELIGIBILITY CHECK (/find-course or lead form) → LEAD (CRM, DC-L-…) → WHATSAPP / CALL (counsellor, same day) → COUNSELLING → APPLICATION (DC-2026-…) → DOCUMENTS → ADMISSION.\n\nEvery ad lands on its matching page: MBA → /online-mba, BBA → /online-bba, BCA → /online-bca, MCA → /online-mca, graduation → /online-degree-after-12th (add redirect **/graduation** → this page), comparison → /compare, eligibility → /find-course (add redirect **/check-eligibility** → /find-course). Two lines in `next.config.mjs`.\n")
    L.append("### KPI framework\n\n| Stage | Metric | Starting target (ASSUMPTION) |\n|---|---|---|\n| Awareness | ThruPlay rate, CPM, frequency ≤ 2.5 | ThruPlay ≥ 25% |\n| Engagement | Saves + shares per 1,000 reach | ≥ 15 |\n| Traffic | CTR, landing-page view rate | CTR ≥ 1.2% (feed), LPV ≥ 70% of clicks |\n| Lead | Cost per lead, **cost per qualified lead**, lead→WhatsApp rate | Qualified rate ≥ 45% |\n| Counselling | Lead→counselled within 24h | ≥ 70% |\n| Application | Application starts, submissions, **cost per application** | Counselled→application ≥ 20% |\n| Admission | Admissions, **cost per admission**, revenue per campaign | Track from Day 30 |\n\nThe workbook's **KPI Tracker** sheet computes CPL, CPQL, cost per application and cost per admission per course from the numbers you enter weekly. The two numbers that decide budget are cost per qualified lead (from Day 7) and cost per admission (from Day 30).\n")
    # ---- first 7 days
    L.append("## 2. First-7-day test plan\n\nDays 1–3 organic brand introduction (seal, promise, Online vs Distance). Days 4–7 run four lead-generation creatives simultaneously in Maharashtra with equal daily spend and instant forms that capture qualification, city and course:\n\n| Test | Course | Creative | Landing | Decision metric |\n|---|---|---|---|---|\n| A | MBA (working professional) | Day 4 reel | /online-mba | Cost per qualified lead, WhatsApp reply rate |\n| B | BBA (12th pass) | Day 5 static | /online-bba | Cost per qualified lead |\n| C | BCA (tech career) | Day 6 static | /online-bca | Cost per qualified lead |\n| D | Graduation completion (BA/B.Com) | Day 7 reel | /online-degree-after-12th | Qualified rate (gap cases need counsellor review) |\n\nQualified lead = correct qualification for the course + valid phone + reachable within 24h + city in a served geography + intake-relevant. Counsellor marks each lead in the CRM (stage NEW → CONTACTED → QUALIFIED). On Day 8: pause the creative with the worst cost per qualified lead unless its lead→counselling rate is the best; move its budget to the top two. Keep hooks and visuals fixed during the test; change only the course.\n")
    # ---- lead quality, retargeting, testing, scaling
    L.append("## 3. Lead quality, retargeting, A/B testing and scaling\n\n**Lead quality.** Every lead carries course, qualification, city, budget band and objective (the website captures these). Disqualify: under 18, wrong qualification for the course with no alternative, outside served geography for ODL, unreachable twice. Report weekly: leads → qualified → counselled → application → admission per course.\n\n**Retargeting audiences (build from Day 1):** Instagram engagers 30d · video viewers 50%+ 30d · profile visitors · website visitors 30d · course-page visitors 30d (pixel event `course_viewed`) · eligibility starters (`eligibility_started`) · form openers not submitted 14d · CRM leads without application · applications without documents. Messages are soft: “Still deciding?”, “Not sure if you're eligible?”, “Compare before you apply”. Frequency cap 3/week.\n\n**A/B testing.** Change one variable per test: hook (A/B/C) with the same visual, then visual (A/B) with the winning hook, then CTA (Check My Eligibility vs Get Fee Details), then audience band, then landing page (course page vs course finder). Minimum 50 leads or 7 days per decision.\n\n**Scaling rule (Day 14 and Day 30).** From CRM compute per course: leads, qualified, applications, admissions, cost per qualified lead, cost per application, cost per admission, revenue. Increase spend 20% per week on courses with high qualified rate and application rate; cut 50% where intent or qualification is poor. This should be validated using campaign and CRM data — inventory volume is not sales volume.\n")
    # ---- lead magnets
    L.append("## 4. Lead magnets (10)\n\n| # | Magnet | Instagram day | Landing | Form | Thank-you / follow-up |\n|---|---|---|---|---|---|\n| 1 | Free Course Finder | 30, 46, 74 | /find-course | built-in gate | Shortlist on screen + counsellor call |\n| 2 | Free Eligibility Check | 49, 57, 77 | /find-course (alias /check-eligibility) | name, mobile, qualification | WhatsApp: eligible programs list |\n| 3 | MBA University Comparison | 47, 67 | /online-mba | message MBA | WhatsApp: comparison sheet (A-tier) |\n| 4 | Graduation Completion Guidance | 48, 63, 69 | /online-degree-after-12th | message GRADUATION | Guide + counsellor eligibility review |\n| 5 | Online vs Distance Guide | 3, 51, 65 | /find-course | message MODE | Guide + mode recommendation |\n| 6 | Course & Fee Comparison | 59, 83 | /compare | on-page “Get details” | Written fee breakup |\n| 7 | MBA Specialization Guide | 56, 75 | /online-mba | message SPECIALIZATION | Guide + matching programs |\n| 8 | BCA vs BBA Guide | 19, 50 | /online-bca | message BCA / BBA | Guide + eligibility for both |\n| 9 | Career Upgrade Guide | 58 | /find-course | message UPGRADE | Guide by career stage |\n| 10 | University Selection Checklist | 53, 31 | /compare | message CHECKLIST | Checklist filled for the student's shortlist |\n\nEach magnet needs one WhatsApp template reply (keyword → guide link + counsellor intro) and a counsellor assignment rule in the CRM (course → counsellor).\n")
    # ---- design system
    L.append("## 5. Image design system\n\nPalette: deep navy #0B1F3A (base), royal blue #1E56A0 (accents, links), gold #C9A227 (headline accents, one per creative), white, soft grey #F4F5F7. Typography: serif headline (Newsreader) + clean sans (Figtree), always inside safe margins. 4:5 (1080×1350) feed, 9:16 (1080×1920) reels/stories. Real Indian students and professionals only; no fake certificates, badges, rankings or logos; partner logos only where permitted. Master prompt (used on every day, with only the scene changed):\n\n> " + MASTER_PROMPT.format(ratio="4:5 Instagram portrait") + "\n")
    # ---- weekly stories
    L.append("## 6. Weekly story plan\n\n| Week | Stories |\n|---|---|\n| 1 | Welcome poll (what do you want to do?), Online/Distance this-or-that, question sticker “biggest confusion” |\n| 2 | Quiz: BCA after which qualification?, MBA specialization poll, “DM MBA” CTA |\n| 3 | Poll: brand vs fee vs nearest, fee-breakup carousel repost, “Check eligibility” link sticker |\n| 4 | Course-finder quiz (5 questions), counsellor Q&A replies, documents checklist swipe |\n| 5 | University comparison poll, EMI question box, “Message FEES” CTA |\n| 6 | Myth/fact quiz, admission-steps countdown-free timeline, “Call an expert” sticker |\n| 7 | Lead-magnet stories (Course Finder, Eligibility, MBA comparison), reply-to-story prompts |\n| 8 | Graduation guide, BCA vs BBA quiz, “Message GRADUATION” |\n| 9 | Best-performing reels reshared, FAQ answers, eligibility link |\n| 10 | Paid story ad (Day 79) + organic FAQ, “Which course?” poll |\n| 11 | Retargeting-style soft stories (still deciding?), compare tool demo |\n| 12 | Application-help stories (documents upload demo), counsellor intro, call/WhatsApp CTA |\n| 13 | 90-day recap, “which post helped most?” poll, next-intake reminder (SOURCE: two intakes/year) |\n")
    # ---- compliance
    L.append("## 7. Trust and compliance rules (apply to every post)\n\n- Never: student numbers, reviews, testimonials, rankings, accreditation/UGC blanket claims, placement %, salary, job/admission/degree guarantees, fake urgency or scarcity.\n- Recognition: only “verify the university and programme's current recognition/entitlement for your academic session”.\n- Fees: quote only SOURCE ranges, always with “verify current”; fees are paid to the university.\n- Confidential: no commission, payout, revenue share, margin, cost, centre pay, loan payout or partner economics — anywhere.\n- Eligibility: “Check your eligibility” — never promise that a gap/backlog case is solvable.\n")
    # ---- compact table
    L.append("## 8. 90-day calendar — compact table\n\n| Day | Phase | Type | Format | Course | Objective | Funnel | Hook | Landing | Primary KPI | Purpose |\n|---|---|---|---|---|---|---|---|---|---|---|")
    for x in DAYS:
        L.append(f"| {x['day']} | {x['phase'].split(' · ')[0]} | [{x['mode']}] | {x['fmt']} | {x['course']} | {x['objective']} | {x['funnel']} | {x['hook']} | {x['lp']} | {x['kpi1']} | {' '.join('['+p+']' for p in x['purpose'])} |")
    # ---- detailed
    L.append("\n## 9. Day-by-day creative sheets\n")
    for x in DAYS:
        cap = f"{x['hook']}\n\n{x['body']}\n\n{x['trust']}\n\n{x['cta']}{'' if x['dm']=='—' else f' · DM/WhatsApp “{x['dm']}” · 98 33 07 44 76'}"
        L.append(f"### DAY {x['day']} — [{x['mode']}] {x['fmt']} · {x['course']} · {x['category']}\n")
        L.append(f"- **Phase:** {x['phase']}  \n- **Objective:** {x['objective']} · **Funnel:** {x['funnel']} · **Purpose:** {' '.join('['+p+']' for p in x['purpose'])} · **Class:** {x['cls']} CONTENT\n- **Audience:** {x['audience']} · **Age:** {x['age']} · **Geography:** {x['geo']}\n- **Hook:** {x['hook']}\n- **Post idea:** {x['idea']}\n- **Caption:**\n\n```\n{cap}\n```\n\n- **Hashtags:** {x['tags']}\n- **Image / video concept:** {x['scene']}\n- **AI image prompt:** {MASTER_PROMPT.format(ratio=x['ratio'])}Scene: {x['scene']}\n- **Paid / organic:** {x['mode']} · **Campaign objective:** {x['campaign']}\n- **Landing page:** {x['lp']} · **WhatsApp / call CTA:** {'—' if x['dm']=='—' else 'Message ' + x['dm']} / Call 98 33 07 44 76\n- **Primary KPI:** {x['kpi1']} · **Secondary KPI:** {x['kpi2']}" + (f"\n- **Story ideas:** {x['story']}" if x.get('story') else "") + "\n")
    # ---- library
    L.append("## 10. Creative library\n")
    for k, v in LIB.items():
        L.append(f"### {k}\n" + "\n".join(f"{i+1}. {h}" for i, h in enumerate(v)) + "\n")
    L.append("## 11. Operating rhythm for a founder without a marketing team\n\n- **Daily (20 min):** post the day's creative (workbook column “Status”), reply to comments/DMs with the keyword templates, mark leads in CRM.\n- **Every Monday (45 min):** fill the KPI Tracker for last week per course; move budget per the Day-7/14/30 rules; pick next week's story stickers.\n- **Day 7 / 14 / 30 / 60 / 90:** decision reviews using the tracker's cost per qualified lead and cost per application — the only two numbers that matter until admissions data exists.\n")
    return "\n".join(L)

# ---------------------------------------------------------------------------------------------
# Workbook
# ---------------------------------------------------------------------------------------------
NAVY = "0B1F3A"; GOLD = "C9A227"
hdr_font = Font(name="Arial", bold=True, color="FFFFFF", size=10); base = Font(name="Arial", size=10); inp = Font(name="Arial", size=10, color="0000FF")
fill_hdr = PatternFill("solid", fgColor=NAVY); fill_in = PatternFill("solid", fgColor="FFFF00"); fill_alt = PatternFill("solid", fgColor="F4F5F7"); fill_paid = PatternFill("solid", fgColor="F6EFD6")
thin = Side(style="thin", color="E3E6EB"); border = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap = Alignment(wrap_text=True, vertical="top")

def header(ws, row, cols, widths=None):
    for i, c in enumerate(cols, 1):
        cell = ws.cell(row=row, column=i, value=c); cell.font = hdr_font; cell.fill = fill_hdr; cell.alignment = Alignment(wrap_text=True, vertical="center"); cell.border = border
        if widths: ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]
    ws.freeze_panes = ws.cell(row=row + 1, column=1)

def xlsx():
    wb = Workbook()
    # --- Summary
    ws = wb.active; ws.title = "Master Summary"
    ws["A1"] = "DegreeComplete.in — 90-day Instagram & performance marketing system"; ws["A1"].font = Font(name="Arial", bold=True, size=14, color=NAVY)
    ws["A2"] = "Prepared 03-Sep-2026 · Read DegreeComplete_90Day_Strategy.md for the full reasoning. Blue text = inputs you may change; formulas are black."; ws["A2"].font = base
    rows = [("Course priority", "MBA 30% · BBA 15% · BCA 15% · MCA 12% · BA 10% · B.Com 6% · MA/M.Com/M.Sc 6% · B.Sc 2% · Diploma/Certificate/Executive/DBA 4% (re-set on Day 30 from CRM)"),
            ("University priority", "A: NMIMS, Manipal Jaipur, Amity, LPU, Chandigarh, D.Y. Patil Navi Mumbai, D.Y. Patil Pune, Sikkim Manipal · B: UPES, Amrita, VIT, Bennett, Christ, Galgotias, Alliance, VGU, GLA, Parul, Uttaranchal · C: KUK, Andhra, Mangalayatan (ODL), ADTU*, Shoolini*, DBA/OPJ (executive) · Excluded: Sharda (on hold), SRM (not available)"),
            ("Audience", "A 12th pass 18–24 (30%) · B graduates 21–34 (35%) · C working 24–40 (25%) · D academic gap 21–34 (10%)"),
            ("Geography", "Days 1–30: " + GEO_PRIMARY + " · Days 31–90 (Online only): expansion one city at a time (Delhi NCR, Bengaluru, Hyderabad, Ahmedabad, Kolkata, Jaipur, Lucknow, Patna) · ODL: check jurisdiction first"),
            ("Age ad sets", "UG 18–24 · PG 21–34 · Working 24–40 · test bands 18–24 / 21–30 / 25–34 / 30–40 · never below 18"),
            ("Content mix", "60 organic + 30 performance ads; ~35 reel-format days, 26 carousels, 28 static, 6 story sets"),
            ("Paid mix", "6 awareness · 4 engagement · 4 traffic · 10 lead gen (4 in test week) · 3 retargeting · 3 conversion"),
            ("Budget", "See Budget sheet: LOW/MEDIUM/HIGH scenarios and phase splits (Awareness / Lead gen / Retargeting / Conversion)"),
            ("Funnel", "Cold → Awareness → Video → Engagement → Website → Course page → Eligibility → Lead → WhatsApp/Call → Counselling → Application → Admission"),
            ("Decisive KPIs", "Cost per QUALIFIED lead (from Day 7) → Cost per application (Day 30) → Cost per admission (Day 60+)"),
            ("Landing pages", "MBA /online-mba · BBA /online-bba · BCA /online-bca · MCA /online-mca · Graduation /online-degree-after-12th (add /graduation redirect) · Compare /compare · Eligibility /find-course (add /check-eligibility redirect)")]
    for i, (k, v) in enumerate(rows, start=4):
        ws.cell(row=i, column=1, value=k).font = Font(name="Arial", bold=True, size=10, color=NAVY); c = ws.cell(row=i, column=2, value=v); c.font = base; c.alignment = wrap
    ws.column_dimensions["A"].width = 22; ws.column_dimensions["B"].width = 120
    # --- Calendar
    ws = wb.create_sheet("Calendar")
    cols = ["Day", "Phase", "Paid/Organic", "Content format", "Course", "Category", "Objective", "Funnel", "Audience", "Age", "Geography", "Hook", "Post idea", "Caption", "CTA", "WhatsApp keyword", "Hashtags", "Image/video concept", "AI image prompt", "Campaign objective", "Landing page", "Primary KPI", "Secondary KPI", "Purpose tags", "Content class", "Story ideas", "Status (edit)", "Posted on (edit)", "Notes (edit)"]
    widths = [5, 18, 14, 16, 12, 22, 16, 8, 22, 8, 30, 40, 50, 70, 24, 12, 40, 50, 60, 26, 26, 22, 20, 22, 14, 40, 14, 14, 30]
    header(ws, 1, cols, widths)
    for r, x in enumerate(DAYS, start=2):
        cap = f"{x['hook']}\n\n{x['body']}\n\n{x['trust']}\n\n{x['cta']}{'' if x['dm']=='—' else f' · DM/WhatsApp “{x['dm']}” · 98 33 07 44 76'}"
        vals = [x["day"], x["phase"], x["mode"], x["fmt"], x["course"], x["category"], x["objective"], x["funnel"], x["audience"], x["age"], x["geo"], x["hook"], x["idea"], cap, x["cta"],
                x["dm"], x["tags"], x["scene"], MASTER_PROMPT.format(ratio=x["ratio"]) + "Scene: " + x["scene"], x["campaign"], x["lp"], x["kpi1"], x["kpi2"], " ".join("[" + p + "]" for p in x["purpose"]), x["cls"] + " CONTENT", x.get("story") or "", "Planned", "", ""]
        for c, v in enumerate(vals, 1):
            cell = ws.cell(row=r, column=c, value=v); cell.font = inp if c >= 27 else base; cell.alignment = wrap; cell.border = border
            if x["mode"] == "PERFORMANCE AD": cell.fill = fill_paid
            if c >= 27: cell.fill = fill_in
        ws.row_dimensions[r].height = 120
    ws.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{len(DAYS)+1}"
    # --- University tiers
    ws = wb.create_sheet("University Tiers")
    header(ws, 1, ["Tier", "University", "Reason (student-fit criteria only)", "Lead with"], [8, 40, 90, 40])
    for r, (t, s, why, lead) in enumerate(TIERS, start=2):
        for c, v in enumerate([t, uni_name(s), why, lead], 1):
            cell = ws.cell(row=r, column=c, value=v); cell.font = base; cell.alignment = wrap; cell.border = border
    ws.cell(row=len(TIERS) + 3, column=1, value="Payout/commission data was not used for tiering and must never appear in student-facing content.").font = Font(name="Arial", italic=True, size=9)
    # --- Budget (formulas)
    ws = wb.create_sheet("Budget")
    ws["A1"] = "Budget scenarios (monthly, INR) — blue/yellow cells are ASSUMPTIONS: overwrite with your actual numbers"; ws["A1"].font = Font(name="Arial", bold=True, size=12, color=NAVY)
    header(ws, 3, ["Scenario", "Monthly budget (INR)", "Days 1–7 total (÷30×7)", "Awareness", "Lead gen", "Retargeting", "Conversion", "Check"], [16, 20, 20, 14, 14, 14, 14, 10])
    for r, (name, amt) in enumerate([("LOW", 30000), ("MEDIUM", 100000), ("HIGH", 300000)], start=4):
        ws.cell(row=r, column=1, value=name).font = base
        c = ws.cell(row=r, column=2, value=amt); c.font = inp; c.fill = fill_in; c.number_format = "#,##0"; c.comment = Comment("Assumption — replace with your real monthly ad budget.", "DegreeComplete")
        ws.cell(row=r, column=3, value=f"=B{r}/30*7").number_format = "#,##0"
        for c, col in zip(range(4, 8), ["B", "C", "D", "E"]):
            ws.cell(row=r, column=c, value=f"=$B{r}*{col}$13").number_format = "#,##0"
        ws.cell(row=r, column=8, value=f"=IF(ROUND(SUM(D{r}:G{r})-B{r},0)=0,\"OK\",\"CHECK\")")
    ws["A9"] = "Steady-state split (Days 15–30) used above — edit the percentages below; each phase row must total 100%"; ws["A9"].font = Font(name="Arial", bold=True, size=10, color=NAVY)
    header(ws, 10, ["Phase", "Awareness", "Lead gen", "Retargeting", "Conversion", "Total"], [26, 14, 14, 14, 14, 10])
    phases = [("Days 1–7 (test)", .10, .90, 0, 0), ("Days 8–14", .15, .75, .10, 0), ("Days 15–30", .20, .60, .15, .05), ("Days 31–60", .30, .45, .15, .10), ("Days 61–90 (scale)", .20, .50, .15, .15)]
    for r, (ph, a, l, rt, cv) in enumerate(phases, start=11):
        ws.cell(row=r, column=1, value=ph).font = base
        for c, v in zip(range(2, 6), [a, l, rt, cv]):
            cell = ws.cell(row=r, column=c, value=v); cell.font = inp; cell.fill = fill_in; cell.number_format = "0%"
        ws.cell(row=r, column=6, value=f"=SUM(B{r}:E{r})").number_format = "0%"
    ws["A18"] = "Rules: after Day 7 move budget to the course with the lowest cost per QUALIFIED lead; after Day 14 to the best lead→counselling rate; after Day 30 to the best cost per application. Never scale a course whose qualified-lead rate is below 40%."; ws["A18"].font = Font(name="Arial", size=9, italic=True)
    # --- KPI tracker (formulas)
    ws = wb.create_sheet("KPI Tracker")
    ws["A1"] = "Weekly KPI tracker per course — enter blue cells from Meta Ads Manager + CRM; formulas compute costs and rates"; ws["A1"].font = Font(name="Arial", bold=True, size=12, color=NAVY)
    cols = ["Week", "Course", "Spend (INR)", "Reach", "Link clicks", "Leads", "Qualified leads", "Counselled", "Applications", "Admissions", "CTR", "CPL", "Cost per qualified lead", "Qualified rate", "Counselled rate", "Application rate", "Cost per application", "Cost per admission"]
    header(ws, 3, cols, [8, 12, 12, 10, 10, 8, 10, 10, 10, 10, 8, 10, 14, 10, 10, 10, 14, 14])
    example = [1, "MBA", 15000, 42000, 620, 48, 26, 19, 4, 1]
    for r in range(4, 40):
        vals = example if r == 4 else [None] * 10
        for c, v in enumerate(vals, 1):
            cell = ws.cell(row=r, column=c, value=v); cell.font = inp; cell.fill = fill_in; cell.border = border
            if c == 3 and v is not None: cell.number_format = "#,##0"
        f = {11: f"=IF(D{r}=0,\"-\",E{r}/D{r})", 12: f"=IF(F{r}=0,\"-\",C{r}/F{r})", 13: f"=IF(G{r}=0,\"-\",C{r}/G{r})", 14: f"=IF(F{r}=0,\"-\",G{r}/F{r})",
             15: f"=IF(G{r}=0,\"-\",H{r}/G{r})", 16: f"=IF(H{r}=0,\"-\",I{r}/H{r})", 17: f"=IF(I{r}=0,\"-\",C{r}/I{r})", 18: f"=IF(J{r}=0,\"-\",C{r}/J{r})"}
        for c, formula in f.items():
            cell = ws.cell(row=r, column=c, value=formula); cell.font = base; cell.border = border
            cell.number_format = "0.00%" if c in (11, 14, 15, 16) else "#,##0"
    ws["A4"].comment = Comment("Example row with illustrative values — overwrite with real weekly numbers. Delete if not needed.", "DegreeComplete")
    ws["A41"] = "Qualified lead = correct qualification for the course + valid, reachable phone (24h) + served geography + intake-relevant. Mark in CRM stage QUALIFIED."; ws["A41"].font = Font(name="Arial", size=9, italic=True)
    # --- Creative library
    ws = wb.create_sheet("Creative Library")
    header(ws, 1, ["Set", "#", "Hook / CTA / Headline"], [30, 5, 90])
    r = 2
    for k, v in LIB.items():
        for i, h in enumerate(v, 1):
            for c, val in enumerate([k, i, h], 1):
                cell = ws.cell(row=r, column=c, value=val); cell.font = base; cell.alignment = wrap; cell.border = border
            r += 1
    # --- Weekly stories
    ws = wb.create_sheet("Weekly Stories")
    header(ws, 1, ["Week", "Story ideas"], [8, 120])
    weekly = ["Welcome poll (what do you want to do?), Online/Distance this-or-that, question sticker 'biggest confusion'", "Quiz: BCA after which qualification?, MBA specialization poll, 'DM MBA' CTA", "Poll: brand vs fee vs nearest, fee-breakup repost, 'Check eligibility' link sticker", "Course-finder quiz (5 questions), counsellor Q&A replies, documents checklist swipe", "University comparison poll, EMI question box, 'Message FEES' CTA", "Myth/fact quiz, admission-steps timeline, 'Call an expert' sticker", "Lead-magnet stories (Course Finder, Eligibility, MBA comparison), reply prompts", "Graduation guide, BCA vs BBA quiz, 'Message GRADUATION'", "Best reels reshared, FAQ answers, eligibility link", "Paid story ad (Day 79) + organic FAQ, 'Which course?' poll", "Retargeting-style soft stories (still deciding?), compare tool demo", "Application-help stories (documents upload demo), counsellor intro, call/WhatsApp CTA", "90-day recap, 'which post helped most?' poll, next-intake reminder"]
    for r, s in enumerate(weekly, start=2):
        ws.cell(row=r, column=1, value=r - 1).font = base; c = ws.cell(row=r, column=2, value=s); c.font = base; c.alignment = wrap
    # --- Legend
    ws = wb.create_sheet("Legend")
    for r, t in enumerate(["Blue text / yellow fill = cells you edit (Status, Posted on, Notes in Calendar; scenario budgets and phase % in Budget; weekly inputs in KPI Tracker).", "Black = formulas — do not overwrite.", "Gold-tinted rows in Calendar = PERFORMANCE AD days (30). White rows = ORGANIC (60).", "Facts tagged SOURCE come from your July-2026 fee sheets / admission master and must be re-verified before quoting in an ad.", "Never add commission/payout/margin figures to any sheet that is shared with designers, agencies or students."], start=1):
        ws.cell(row=r, column=1, value=t).font = base
    ws.column_dimensions["A"].width = 140
    path = OUT / "DegreeComplete_90Day_Calendar.xlsx"; wb.save(path); return path

if __name__ == "__main__":
    (OUT / "DegreeComplete_90Day_Strategy.md").write_text(md())
    p = xlsx()
    print("written", p, (OUT / "DegreeComplete_90Day_Strategy.md").stat().st_size // 1024, "KB md")
