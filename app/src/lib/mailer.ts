const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

export async function sendLeadEmail(data: {
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
  if (!SCRIPT_URL) {
    console.warn("GOOGLE_SCRIPT_URL not set — skipping lead email.");
    return;
  }

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Google Script responded ${res.status}`);
  }
}
