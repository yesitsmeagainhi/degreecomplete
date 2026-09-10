import { NextResponse } from "next/server";
import { dbPublic } from "@/lib/db";
import { leadSchema } from "@/lib/validation";
import { nextCode } from "@/lib/ids";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { normaliseMobile } from "@/lib/auth";
import { sendLeadEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const ip = clientIp(req);

  if (!rateLimit(`leads:${ip}`, 8, 10 * 60 * 1000).ok) {
    return NextResponse.json(
      {
        error:
          "Too many requests. Please try again in a few minutes.",
      },
      { status: 429 }
    );
  }

  const parsed = leadSchema.safeParse(
    await req.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check your name and mobile number.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;

  // Honeypot
  if (d.website) {
    return NextResponse.json({
      ok: true,
      leadCode: "DC-L-0000-000000",
    });
  }

  try {
    const university = d.universitySlug
      ? await dbPublic.university.findUnique({
          where: { slug: d.universitySlug },
          select: { id: true, name: true },
        })
      : null;

    const program =
      university && d.programSlug
        ? await dbPublic.program.findUnique({
            where: {
              universityId_slug: {
                universityId: university.id,
                slug: d.programSlug,
              },
            },
            select: { id: true, courseDisplay: true },
          })
        : null;

    const leadCode = await nextCode(dbPublic, "lead");
    const mobile = normaliseMobile(d.mobile);
    const whatsapp = d.whatsapp ? normaliseMobile(d.whatsapp) : null;

    await dbPublic.lead.create({
      data: {
        leadCode,
        name: d.name,
        mobile,
        whatsapp,
        email: d.email || null,
        city: d.city || null,
        qualification: d.qualification || null,
        interestedCourse: d.interestedCourse || null,
        interestedUniversityId: university?.id,
        programId: program?.id,
        specialization: d.specialization || null,
        mode: d.mode ?? null,
        budget: d.budget || null,
        objective: d.objective || null,
        source: d.source,
        utmSource: d.utm?.source,
        utmMedium: d.utm?.medium,
        utmCampaign: d.utm?.campaign,
        campaign: d.utm?.campaign,
        landingPath: d.landingPath,
      },
    });

    // Send lead details by email (non-blocking — lead is already saved)
    try {
      await sendLeadEmail({
        leadCode,
        name: d.name,
        mobile,
        whatsapp,
        email: d.email || null,
        city: d.city || null,
        qualification: d.qualification || null,
        interestedCourse: d.interestedCourse || null,
        university: university?.name || null,
        program: program?.courseDisplay || null,
        specialization: d.specialization || null,
        mode: d.mode ?? null,
        budget: d.budget || null,
        objective: d.objective || null,
        source: d.source,
      });
    } catch (emailErr) {
      console.error("Failed to send lead notification email:", emailErr);
    }

    return NextResponse.json({ ok: true, leadCode });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Lead submission failed:", msg, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", detail: process.env.NODE_ENV !== "production" ? msg : undefined },
      { status: 500 },
    );
  }
}