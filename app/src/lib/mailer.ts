import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendLeadEmail({
  leadCode,
  name,
  mobile,
  whatsapp,
  email,
  city,
  qualification,
  interestedCourse,
  university,
  program,
  specialization,
  mode,
  budget,
  objective,
  source,
}: {
  leadCode: string;
  name: string;
  mobile: string;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  qualification?: string | null;
  interestedCourse?: string | null;
  university?: string | null;
  program?: string | null;
  specialization?: string | null;
  mode?: string | null;
  budget?: string | null;
  objective?: string | null;
  source?: string | null;
}) {
  await transporter.sendMail({
    from: `"Distance Campus" <${process.env.SMTP_USER}>`,
    to: process.env.LEAD_NOTIFICATION_EMAIL,
    replyTo: email || undefined,

    subject: `New Lead - ${name} - ${leadCode}`,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;">
        <h2>New Lead Received</h2>

        <table
          cellpadding="8"
          cellspacing="0"
          border="1"
          style="border-collapse:collapse;width:100%;"
        >
          <tr>
            <td><strong>Lead Code</strong></td>
            <td>${leadCode}</td>
          </tr>

          <tr>
            <td><strong>Name</strong></td>
            <td>${name}</td>
          </tr>

          <tr>
            <td><strong>Mobile</strong></td>
            <td>${mobile}</td>
          </tr>

          <tr>
            <td><strong>WhatsApp</strong></td>
            <td>${whatsapp || "-"}</td>
          </tr>

          <tr>
            <td><strong>Email</strong></td>
            <td>${email || "-"}</td>
          </tr>

          <tr>
            <td><strong>City</strong></td>
            <td>${city || "-"}</td>
          </tr>

          <tr>
            <td><strong>Qualification</strong></td>
            <td>${qualification || "-"}</td>
          </tr>

          <tr>
            <td><strong>Interested Course</strong></td>
            <td>${interestedCourse || "-"}</td>
          </tr>

          <tr>
            <td><strong>University</strong></td>
            <td>${university || "-"}</td>
          </tr>

          <tr>
            <td><strong>Program</strong></td>
            <td>${program || "-"}</td>
          </tr>

          <tr>
            <td><strong>Specialization</strong></td>
            <td>${specialization || "-"}</td>
          </tr>

          <tr>
            <td><strong>Mode</strong></td>
            <td>${mode || "-"}</td>
          </tr>

          <tr>
            <td><strong>Budget</strong></td>
            <td>${budget || "-"}</td>
          </tr>

          <tr>
            <td><strong>Objective</strong></td>
            <td>${objective || "-"}</td>
          </tr>

          <tr>
            <td><strong>Source</strong></td>
            <td>${source || "-"}</td>
          </tr>
        </table>
      </div>
    `,
  });
}