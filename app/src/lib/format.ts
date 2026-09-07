export const inr = (n: number | null | undefined) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : null;

export const modeLabel = (m: string) => (m === "DISTANCE" ? "Distance" : "Online");

export const levelLabel = (l: string) =>
  ({ UG: "Undergraduate", PG: "Postgraduate", Diploma: "Diploma", "PG Diploma": "PG Diploma", Certificate: "Certificate", Doctoral: "Doctoral", Other: "Program" } as Record<string, string>)[l] ?? l;

export const planLabel = (p: string) =>
  ({ STANDARD: "Standard", LOAN: "With education loan", SCHOLARSHIP: "Scholarship / grant", WORKING_PROFESSIONAL: "Working professional", EMI: "No-cost EMI" } as Record<string, string>)[p] ?? p;

export const examBasisLabel = (b: string | null | undefined) =>
  ({ per_semester: "per semester", per_year: "per year", total: "total", per_subject_reattempt: "per subject re-attempt", per_semester_included: "per semester (included)", unspecified: "" } as Record<string, string>)[b ?? ""] ?? "";

export const dateLabel = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export const intakeLabel = (i: string | null | undefined) => {
  if (!i) return "";
  const [y, m] = i.split("-");
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ${y} intake`;
};

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
