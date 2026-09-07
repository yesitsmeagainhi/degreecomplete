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
            <section key={title} className="mt-8"><h2>{title}</h2><div className="mt-3 overflow-x-auto rounded-xl2 border border-line"><table className="w-full min-w-[640px] text-sm"><thead><tr className="bg-mist text-left"><th className="p-3">Document</th><th className="p-3">Needed for</th><th className="p-3">Format</th><th className="p-3">Notes</th></tr></thead><tbody>{items.map((d) => <tr key={d.num} className="border-t border-line align-top"><td className="p-3 font-medium text-navy">{d.name}</td><td className="p-3 text-gray-700">{d.requiredFor}</td><td className="p-3 text-gray-700">{d.format}</td><td className="p-3 text-gray-600">{d.remarks}</td></tr>)}</tbody></table></div></section>) : null;
        })}
        {notes.abc_note && <p className="card mt-8 max-w-prose text-sm text-gray-700"><span className="font-semibold text-navy">ABC / APAAR ID: </span>{notes.abc_note}</p>}
        <div className="mt-8 flex flex-wrap gap-3"><LeadCta context={{ source: "documents-page" }} label="Ask which documents I need" /><Link href="/apply" className="btn-outline">Start my application</Link></div>
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
      <div className="mt-8 flex flex-wrap gap-3"><LeadCta context={{ source: "process-page" }} label="Start with a free eligibility check" /><Link href="/documents-required" className="btn-outline">Documents checklist</Link></div>
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
      <div className="mt-8"><LeadCta context={{ source: "eligibility-page" }} label="Check my eligibility" /></div>
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
    <div className="container-x py-10">
      <h1>{title}</h1>
      <p className="mt-3 max-w-prose text-lg text-gray-700">{intro}</p>
      <div className="mt-6 flex flex-wrap gap-3"><LeadCta context={{ source: `seo-${slug}`, interestedCourse: course, mode: mode === "DISTANCE" ? "Distance" : "Online" }} label="Check my eligibility" /><Link href={`/search?course=${encodeURIComponent(course)}${mode ? `&mode=${mode}` : ""}`} className="btn-outline">All {course === "UG" ? "UG" : course} programs</Link></div>
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[["Universities", universities.length ? String(universities.length) : site.contactToConfirm], ["Fees from", fees.length ? inr(Math.min(...fees))! : site.contactToConfirmFee], ["Duration", durations.length ? `${durations.sort().join("–")} years` : "Confirm with advisor"]].map(([k, v]) => (
          <div key={k} className="card"><p className="muted">{k}</p><p className="font-serif text-2xl text-navy">{v}</p></div>
        ))}
      </section>
      <section className="mt-10"><h2>Eligibility</h2><p className="mt-3 max-w-prose text-gray-700">{eligibilityText}</p>{rule?.minMarks && <p className="muted mt-2">Typical minimum marks: {rule.minMarks}{rule.extra ? ` · ${rule.extra}` : ""}</p>}<Link href="/eligibility" className="mt-2 inline-block text-sm underline">All level-wise eligibility rules</Link></section>
      <section className="mt-10">
        <h2>Available universities and fees</h2>
        {hits.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{hits.map((p) => <ProgramCard key={p.id} p={p} />)}</div> : (
          <div className="card mt-4 max-w-xl"><p className="font-medium text-navy">No {title} program is published yet.</p><p className="muted mt-1">{site.contactToConfirm} — our advisors can share options that are still being verified.</p></div>
        )}
      </section>
      <section className="mt-10 max-w-prose">
        <h2>Frequently asked questions</h2>
        <div className="mt-4 space-y-3">{faq.map(([q, a]) => <details key={q} className="card"><summary className="cursor-pointer font-medium text-navy">{q}</summary><p className="mt-2 text-gray-700">{a}</p></details>)}</div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
      </section>
      <div className="mt-10"><LeadCta context={{ source: `seo-${slug}-bottom`, interestedCourse: course }} label="Talk to an education expert" className="btn-primary" /></div>
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
