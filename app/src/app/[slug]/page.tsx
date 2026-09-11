import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { seoPages, site, levelGuidance } from "@/lib/config";
import { searchPrograms, getContentPage, listFaqs, getDocumentRequirements, getAdmissionSteps, getEligibilityRules, getSiteNotes, programHeadline } from "@/lib/catalog";
import { ProgramCard } from "@/components/Cards";
import { LeadCta } from "@/components/LeadForm";
import { inr } from "@/lib/format";

export const dynamic = "force-dynamic";

/** One route serves both the SEO course landing pages (/online-mba …) and CMS content pages (/about …). */
const specialPages: Record<string, { title: string; description: string }> = {
  "documents-required": { title: "Documents required for online & distance admission", description: "The complete soft-copy document checklist for online and distance degree admission — formats, who needs what, and the verification flow." },
  "admission-process": { title: "Admission process — step by step", description: "How admission to an online or distance program works, from counselling to LMS access, with timelines." },
  "eligibility": { title: "Eligibility for online & distance degrees", description: "Level-wise eligibility, minimum marks and duration rules used by partner universities." },
  "how-it-works": { title: "How it works — your path from enquiry to enrollment", description: "Step-by-step guide to choosing, applying and enrolling in an online or distance degree through DegreeComplete." },
};

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const sp = specialPages[params.slug];
  if (sp) return { title: sp.title, description: sp.description, alternates: { canonical: `${site.url}/${params.slug}` } };
  const seo = seoPages[params.slug];
  if (seo) return { title: `${seo.title} — universities, fees, eligibility`, description: seo.intro, alternates: { canonical: `${site.url}/${params.slug}` } };
  const page = await getContentPage(params.slug);
  if (page) return { title: page.metaTitle ?? page.title, description: page.metaDesc ?? undefined };
  return { title: "Page" };
}

export default async function SlugPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  if (params.slug === "documents-required") return <DocumentsPage />;
  if (params.slug === "admission-process") return <ProcessPage />;
  if (params.slug === "eligibility") return <EligibilityPage />;
  if (params.slug === "how-it-works") return <HowItWorksPage />;
  const seo = seoPages[params.slug];
  if (seo) return <SeoCoursePage slug={params.slug} {...seo} />;
  const page = await getContentPage(params.slug);
  if (!page) notFound();
  const faqs = params.slug === "faq" ? await listFaqs() : [];
  return (
    <div className="container-x py-10">
      <article>
        <h1>{page.title}</h1>
        <div className="prose-dc mt-6 text-gray-800" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
        {faqs.length > 0 && <div className="mt-8 space-y-4">{faqs.map((f) => <details key={f.question} className="card"><summary className="cursor-pointer font-medium text-navy">{f.question}</summary><p className="mt-2 text-gray-700">{f.answer}</p></details>)}</div>}
        {params.slug === "contact" && <p className="mt-6 text-gray-700">Call or WhatsApp <a href={`tel:${site.phone}`} className="font-semibold text-navy">{site.phoneDisplay}</a>, or use any “Talk to an education expert” button on the site.</p>}
      </article>
    </div>
  );
}

async function DocumentsPage() {
  const [docs, notes] = await Promise.all([getDocumentRequirements(), getSiteNotes()]);
  const groups: [string, (d: (typeof docs)[number]) => boolean][] = [["Mandatory for everyone", (d) => d.mandatory === "Yes"], ["Mandatory for postgraduate / executive / doctoral", (d) => (d.mandatory ?? "").startsWith("Yes (")], ["Only if it applies to you", (d) => !(d.mandatory ?? "").startsWith("Yes")]];
  return (
    <div className="container-x py-10">
      <h1>Documents required for admission</h1>
      <p className="mt-3 max-w-prose text-lg text-gray-700">{notes.process_note ?? "All documents must be submitted as clear soft copies (scanned PDF/JPG). Documents are verified first; admission is processed only after successful verification."}</p>
      {/* {notes.verification_flow && <div className="card mt-6 max-w-prose"><p className="font-semibold text-navy">How verification works</p><p className="mt-2 text-sm text-gray-700">{notes.verification_flow}</p></div>} */}
      <div className="grid gap-10 md:grid-cols-2 items-start">

        {notes.verification_flow && (
          <div className="card mt-6 max-w-2xl">
            <p className="font-semibold text-navy">How verification works</p>
            <ol className="flow-steps mt-4">
              {notes.verification_flow.split("→")
                .map((s: string) => s.trim())
                .filter((s: string) => Boolean(s) && !s.startsWith("Admission proceeds"))
                .map((step: string, i: number) => {
                  const clean = step.replace(/^Step\s*\d+\s*[–-]\s*/i, "");
                  return (
                    <li key={i} className="flow-step">
                      <span className="flow-num">{i + 1}</span>
                      <span className="text-sm text-gray-700">{clean}</span>

                    </li>
                  )
                })}
            </ol>
            <p className="muted mt-3 text-xs">Admission proceeds only after successful document verification.</p>

          </div>

        )}
        {/* RIGHT COLUMN */}
        <div className="hidden md:block">
          <div className="sticky top-28">
            <img
              src="/image/steps.png"
              alt="Distance Campus"
              width={700}
              height={700}
              className="w-full h-auto object-contain"
            />
          </div></div>
        </div>
        {groups.map(([title, pred]) => {
          const items = docs.filter(pred); return items.length ? (
            <section key={title} className="mt-8"><h2>{title}</h2><div className="mt-3 overflow-x-auto rounded-xl2 border border-navy/20"><table className="w-full min-w-[640px] text-sm border-collapse"><thead><tr className="bg-navy text-left text-white"><th className="border border-navy/30 p-3">Document</th><th className="border border-navy/30 p-3">Needed for</th><th className="border border-navy/30 p-3">Format</th><th className="border border-navy/30 p-3">Notes</th></tr></thead><tbody>{items.map((d) => <tr key={d.num} className="align-top even:bg-blue-50/50"><td className="border border-line p-3 font-medium text-navy">{d.name}</td><td className="border border-line p-3 text-gray-700">{d.requiredFor}</td><td className="border border-line p-3 text-gray-700">{d.format}</td><td className="border border-line p-3 text-gray-600">{d.remarks}</td></tr>)}</tbody></table></div></section>) : null;
        })}
        {notes.abc_note && <p className="card mt-8 max-w-prose text-sm text-gray-700"><span className="font-semibold text-navy">ABC / APAAR ID: </span>{notes.abc_note}</p>}
        <div className="mt-8 flex flex-wrap gap-3"><LeadCta context={{ source: "documents-page" }} label="Ask which documents I need" className="btn-blue" /><Link href="/apply" className="btn-outline">Start my application</Link></div>
      </div>
    
  );
}

async function ProcessPage() {
  const [steps, notes] = await Promise.all([getAdmissionSteps(), getSiteNotes()]);
  return (
    <div className="container-x py-10">
      <h1>Admission process, step by step</h1>
      <p className="mt-3 max-w-prose text-lg text-gray-700">The standard flow used by UGC-entitled online universities. Your counsellor handles the paperwork with you; you pay the university directly.</p>
      <ol className="mt-8 grid gap-4 md:grid-cols-2">{steps.map((s) => <li key={s.step} className="card flex gap-4"><span className="font-serif text-3xl text-gold">{s.step}</span><div><p className="text-gray-800">{s.action}</p><p className="muted mt-1">{[s.who, s.timeline].filter(Boolean).join(" · ")}</p></div></li>)}</ol>
      {notes.max_duration_rule && <p className="card mt-8 max-w-prose text-sm text-gray-700"><span className="font-semibold text-navy">How long you get to finish: </span>{notes.max_duration_rule}</p>}
      <div className="mt-8 flex flex-wrap gap-3"><LeadCta context={{ source: "process-page" }} label="Start with a free eligibility check" className="btn-blue" /><Link href="/documents-required" className="btn-outline">Documents checklist</Link></div>
    </div>
  );
}

async function EligibilityPage() {
  const [rules, notes] = await Promise.all([getEligibilityRules(), getSiteNotes()]);
  return (
    <div className="container-x py-10">
      <h1>Who is eligible?</h1>
      <p className="mt-3 max-w-prose text-lg text-gray-700">Level-wise rules most partner universities follow. The exact criteria for each program are on its page and confirmed by your advisor.</p>
      {notes.reservation_note && <p className="muted mt-2 max-w-prose">{notes.reservation_note}</p>}
      <div className="mt-8 grid gap-4 md:grid-cols-2">{rules.map((r) => <div key={r.levelLabel} className="card"><h3>{r.levelLabel}</h3><p className="mt-2 text-sm text-gray-800">{r.eligibility}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-gray-500">Minimum marks</dt><dd className="font-medium text-navy">{r.minMarks ?? "—"}</dd></div><div><dt className="text-gray-500">Duration</dt><dd className="font-medium text-navy">{r.duration ?? "—"}</dd></div></dl>{r.extra && <p className="muted mt-2">{r.extra}</p>}</div>)}</div>
      <div className="mt-8"><LeadCta context={{ source: "eligibility-page" }} label="Check my eligibility" className="btn-blue" /></div>
    </div>
  );
}

const howItWorksSteps = [
  { title: "Explore programs", desc: "Browse 30+ UGC-entitled universities offering online and distance degrees. Filter by course, mode, duration and fees. Every program page shows verified fee tables, eligibility criteria and specializations." },
  { title: "Compare side by side", desc: "Shortlist up to four programs and compare fees, duration, specializations and university details on one screen." },
  { title: "Check eligibility with an advisor", desc: "Talk to an education expert on WhatsApp or phone. Share your qualification and documents — your advisor confirms which programs you qualify for, explains fee plans and answers your questions." },
  { title: "Apply and upload documents", desc: "Fill in the application form, choose your university and program, and upload soft copies of your documents (scanned PDF/JPG). Your advisor pre-checks everything before it goes to the university." },
  { title: "Document verification", desc: "The university verifies your documents (typically 2–7 working days). Your advisor keeps you updated at every stage. Once verified, you receive a provisional admission letter and a fee-payment link." },
  { title: "Pay fees and get enrolled", desc: "Pay the university directly — we never collect fees on behalf of a university. After payment you receive your enrollment number, LMS login and ABC/APAAR Academic Bank of Credits ID." },
  { title: "Study and graduate", desc: "Access lectures, assignments and exams through the university's learning management system. Our support team stays available throughout your degree for re-registration, exam scheduling and any admin queries." },
];

async function HowItWorksPage() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl">How it works</h1>
        <p className="mt-3 text-lg text-gray-600">Your path from enquiry to enrollment</p>
        <p className="mt-2 text-sm text-gray-500 max-w-prose mx-auto">DegreeComplete.in is the student-facing platform of Mumbai Institute for Online &amp; Distance Learning (MIODL). We guide you through every step — from choosing the right program to completing enrollment — so you never have to figure it out alone.</p>
      </div>

      {/* Timeline */}
      <div className="relative mt-10 max-w-3xl mx-auto">
        {/* Vertical line */}
        <div className="absolute left-[15px] md:left-[19px] top-0 bottom-0 w-0.5 bg-blue-100" aria-hidden="true" />

        <div className="space-y-6">
          {howItWorksSteps.map((step, i) => (
            <div key={i} className="relative flex gap-4 md:gap-6">
              {/* Step number circle */}
              <div className="relative z-10 flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue flex items-center justify-center">
                <span className="text-sm md:text-base font-bold text-white">{i + 1}</span>
              </div>
              {/* Card */}
              <div className="flex-1 card !p-4 md:!p-5 border border-blue-100 hover:shadow-card-hover transition-shadow">
                <h3 className="text-base md:text-lg font-bold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10 text-center">
        <p className="text-gray-600 font-medium">Have questions? Talk to an education expert.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <LeadCta context={{ source: "how-it-works" }} label="Talk to an expert" className="btn-blue" />
          <Link href="/documents-required" className="btn-outline">Documents checklist</Link>
        </div>
      </div>
    </div>
  );
}

async function SeoCoursePage({ slug, course, mode, title, intro }: { slug: string } & (typeof seoPages)[string]) {
  const [hits, rules] = await Promise.all([searchPrograms({ course, mode, sort: "fee_asc" }), getEligibilityRules()]);
  const fees = hits.map((h) => programHeadline(h).fee).filter((x): x is number => !!x);
  const universities = [...new Set(hits.map((h) => h.university.name))];
  const level = course === "UG" ? "UG" : hits[0]?.level ?? (["MBA", "MCA", "MA", "M.Com", "M.Sc"].includes(course) ? "PG" : "UG");
  const rule = rules.find((r) => r.levelLabel.toUpperCase().startsWith(course.toUpperCase().replace(".", "").slice(0, 3))) ?? rules.find((r) => (level === "UG" ? r.levelLabel.startsWith("BA / BBA") : r.levelLabel.startsWith("MBA (PG")));
  const eligibilityText = rule?.eligibility ?? levelGuidance[level] ?? levelGuidance.Other;
  const durations = [...new Set(hits.map((h) => h.durationYears).filter(Boolean))];
  const faq = [
    [`Is a ${title} valid?`, "Degrees in online and distance mode are awarded by the university itself. Recognition of a specific university/program should be confirmed for that university — our advisor shares the current status rather than a blanket claim."],
    [`What is the fee for ${title}?`, fees.length ? `Published total program fees currently range from ${inr(Math.min(...fees))} to ${inr(Math.max(...fees))} across ${universities.length} universities. ${site.feeDisclaimer}` : site.contactToConfirmFee],
    [`Who is eligible for ${title}?`, eligibilityText],
    [`Which documents do I need for ${title}?`, rule?.documents?.length ? rule.documents.join("; ") : "Class 10 and 12 marksheets, graduation marksheets for PG, Aadhaar, photo and signature — see the full checklist."],
    [`How long does ${title} take?`, durations.length ? `Published durations are ${durations.sort().join(" or ")} years depending on the university.` : "Duration depends on the university; confirm with our advisor."],
    ["Can I get an education loan or EMI?", "Several partner universities work with lenders offering EMI or no-cost EMI plans. Availability and terms vary by university and lender; ask an advisor for options."],
  ];
  return (
    <div className="container-x py-6 md:py-10">
      <h1 className="text-2xl md:text-4xl">{title}</h1>
      <p className="mt-2 md:mt-3 max-w-prose text-sm md:text-lg text-gray-700">{intro}</p>

      {/* Stats row — horizontal on mobile */}
      <section className="mt-5 md:mt-10 grid grid-cols-3 gap-2 md:gap-4">
        {[["Universities", universities.length ? String(universities.length) : site.contactToConfirm], ["Fees from", fees.length ? inr(Math.min(...fees))! : site.contactToConfirmFee], ["Duration", durations.length ? `${durations.sort().join("–")} yrs` : "TBC"]].map(([k, v]) => (
          <div key={k} className="card !p-3 md:!p-5 text-center md:text-left"><p className="muted text-[10px] md:text-sm">{k}</p><p className="font-serif text-base md:text-2xl text-navy mt-0.5">{v}</p></div>
        ))}
      </section>

      <div className="mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-3">
        <LeadCta context={{ source: `seo-${slug}`, interestedCourse: course, mode: mode === "DISTANCE" ? "Distance" : "Online" }} label="Check my eligibility" className="btn-blue !py-2 !px-4 !text-sm !min-h-0 md:!py-3 md:!px-5 md:!text-base md:!min-h-[48px]" />
        <Link href={`/search?course=${encodeURIComponent(course)}${mode ? `&mode=${mode}` : ""}`} className="btn-outline !py-2 !px-4 !text-sm !min-h-0 md:!py-3 md:!px-5 md:!text-base md:!min-h-[48px]">All {course === "UG" ? "UG" : course} programs</Link>
      </div>

      <section className="mt-6 md:mt-10"><h2 className="text-xl md:text-2xl">Eligibility</h2><p className="mt-2 md:mt-3 max-w-prose text-sm md:text-base text-gray-700">{eligibilityText}</p>{rule?.minMarks && <p className="muted mt-2 text-xs md:text-sm">Typical minimum marks: {rule.minMarks}{rule.extra ? ` · ${rule.extra}` : ""}</p>}<Link href="/eligibility" className="mt-2 inline-block text-xs md:text-sm underline">All level-wise eligibility rules</Link></section>

      <section className="mt-6 md:mt-10">
        <h2 className="text-xl md:text-2xl">Available universities and fees</h2>
        {hits.length ? <div className="mt-3 md:mt-4 grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">{hits.map((p) => <ProgramCard key={p.id} p={p} />)}</div> : (
          <div className="card mt-3 md:mt-4 max-w-xl"><p className="font-medium text-navy text-sm md:text-base">No {title} program is published yet.</p><p className="muted mt-1 text-xs md:text-sm">{site.contactToConfirm} — our advisors can share options that are still being verified.</p></div>
        )}
      </section>

      <section className="mt-6 md:mt-10 mx-auto max-w-2xl text-center">
        <h2 className="text-xl md:text-2xl">Frequently asked questions</h2>
        <div className="mt-3 md:mt-4 space-y-2 md:space-y-3 text-left">{faq.map(([q, a]) => <details key={q} className="card !p-3 md:!p-5"><summary className="cursor-pointer font-medium text-navy text-sm md:text-base">{q}</summary><p className="mt-2 text-gray-700 text-sm">{a}</p></details>)}</div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
      </section>

      <div className="mt-6 md:mt-10 text-center"><LeadCta context={{ source: `seo-${slug}-bottom`, interestedCourse: course }} label="Talk to an education expert" className="btn-blue" /></div>
    </div>
  );
}

/** Minimal, safe markdown: headings, paragraphs, lists, blockquotes, bold, links. Escapes HTML first. */
function renderMarkdown(md: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) { close(); const l = line.match(/^#+/)![0].length; out.push(`<h${l + 1}>${inline(line.replace(/^#+\s/, ""))}</h${l + 1}>`); }
    else if (/^>\s?/.test(line)) { close(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`); }
    else if (/^\d+\.\s/.test(line)) { if (list !== "ol") { close(); list = "ol"; out.push("<ol>"); } out.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`); }
    else if (/^[-*]\s/.test(line)) { if (list !== "ul") { close(); list = "ul"; out.push("<ul>"); } out.push(`<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`); }
    else if (line.trim() === "") close();
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join("\n");
}
