import { revalidatePath } from "next/cache";
import { dbAdmin } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export default async function ContentAdmin() {
  await requireStaff("admin.content");
  const [pages, faqs] = await Promise.all([dbAdmin.contentPage.findMany({ orderBy: { slug: "asc" } }), dbAdmin.faqItem.findMany({ orderBy: { sortOrder: "asc" } })]);

  async function savePage(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.content");
    const slug = String(fd.get("slug"));
    const data = { title: String(fd.get("title")).slice(0, 120), body: String(fd.get("body")).slice(0, 50000), metaTitle: String(fd.get("metaTitle") ?? "").slice(0, 120) || null, metaDesc: String(fd.get("metaDesc") ?? "").slice(0, 300) || null, published: fd.get("published") === "on" };
    await dbAdmin.contentPage.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    await audit(s, "content.save", "ContentPage", slug);
    revalidatePath(`/${slug}`); revalidatePath("/admin/content");
  }
  async function saveFaq(fd: FormData) {
    "use server";
    const s = await requireStaff("admin.content");
    const id = String(fd.get("id") ?? "");
    const data = { question: String(fd.get("question")).slice(0, 300), answer: String(fd.get("answer")).slice(0, 3000), category: String(fd.get("category") ?? "").slice(0, 60) || null, sortOrder: Number(fd.get("sortOrder") ?? 0), published: fd.get("published") === "on" };
    if (fd.get("delete")) { if (id) await dbAdmin.faqItem.delete({ where: { id } }); }
    else if (id) await dbAdmin.faqItem.update({ where: { id }, data });
    else await dbAdmin.faqItem.create({ data });
    await audit(s, "faq.save", "FaqItem", id || "new");
    revalidatePath("/faq"); revalidatePath("/admin/content");
  }

  return (
    <div className="space-y-8">
      <div><h1>Content and FAQs</h1><p className="muted mt-1">Pages use simple markdown (headings, lists, bold, links). Pages seeded as placeholders start with a warning line — remove it once the page is written.</p></div>
      <section className="space-y-3">
        {pages.map((p) => (
          <details key={p.id} className="card"><summary className="cursor-pointer font-medium text-navy">/{p.slug} — {p.title} {p.published ? "" : "(unpublished)"}</summary>
            <form action={savePage} className="mt-3 grid gap-2">
              <input type="hidden" name="slug" value={p.slug} />
              <div className="grid gap-2 sm:grid-cols-3"><input name="title" defaultValue={p.title} className="field !min-h-9 text-sm" placeholder="Title" required /><input name="metaTitle" defaultValue={p.metaTitle ?? ""} className="field !min-h-9 text-sm" placeholder="Meta title" /><input name="metaDesc" defaultValue={p.metaDesc ?? ""} className="field !min-h-9 text-sm" placeholder="Meta description" /></div>
              <textarea name="body" rows={12} defaultValue={p.body} className="field font-mono text-sm" />
              <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={p.published} /> Published</label><button className="btn-primary !min-h-9 !py-1 text-sm">Save</button></div>
            </form>
          </details>
        ))}
      </section>
      <section>
        <h2>FAQs</h2>
        <div className="mt-3 space-y-3">
          {[...faqs, null].map((f) => (
            <form key={f?.id ?? "new"} action={saveFaq} className="card grid gap-2 sm:grid-cols-6">
              {f && <input type="hidden" name="id" value={f.id} />}
              <input name="question" defaultValue={f?.question ?? ""} placeholder="Question" required className="field !min-h-9 text-sm sm:col-span-3" />
              <input name="category" defaultValue={f?.category ?? ""} placeholder="Category" className="field !min-h-9 text-sm" />
              <input name="sortOrder" defaultValue={f?.sortOrder ?? 0} inputMode="numeric" className="field !min-h-9 text-sm" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={f?.published ?? true} /> Live</label>
              <textarea name="answer" defaultValue={f?.answer ?? ""} placeholder="Answer" rows={2} required className="field text-sm sm:col-span-6" />
              <div className="flex gap-2 sm:col-span-6"><button className="btn-primary !min-h-9 !py-1 text-sm">{f ? "Save" : "Add FAQ"}</button>{f && <button name="delete" value="1" className="btn-ghost !min-h-9 !py-1 text-sm">Delete</button>}</div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
