export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "DegreeComplete.in",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.degreecomplete.in",
  institution: "Mumbai Institute for Online & Distance Learning",
  tagline: "Complete Your Education. Complete Your Future.",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "+919833074476",
  phoneDisplay: process.env.NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY ?? "98 33 07 44 76",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919833074476",
  feeDisclaimer: "Fees are subject to revision as per university guidelines. Please confirm the current fee before payment.",
  contactToConfirm: "Contact us to confirm current details",
  contactToConfirmFee: "Contact us to confirm current fee",
};

export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const callLink = `tel:${site.phone}`;

/** SEO course landing pages. Keys are URL slugs; course/mode map onto the catalogue. */
export const seoPages: Record<string, { course: string; mode?: "ONLINE" | "DISTANCE"; title: string; intro: string }> = {
  "online-mba": { course: "MBA", mode: "ONLINE", title: "Online MBA", intro: "Compare Online MBA programs from partner universities — specializations, duration and fees in one place." },
  "distance-mba": { course: "MBA", mode: "DISTANCE", title: "Distance MBA", intro: "Distance-mode MBA options currently available through our partner universities." },
  "online-bba": { course: "BBA", mode: "ONLINE", title: "Online BBA", intro: "Online BBA programs for 12th-pass students and working professionals." },
  "online-bca": { course: "BCA", mode: "ONLINE", title: "Online BCA", intro: "Online BCA programs with specializations in AI, data science, cloud and cyber security." },
  "online-mca": { course: "MCA", mode: "ONLINE", title: "Online MCA", intro: "Online MCA programs for graduates who want to move into software, AI and data roles." },
  "online-ba": { course: "BA", mode: "ONLINE", title: "Online BA", intro: "Online BA programs — a flexible way to complete your graduation from home." },
  "distance-ba": { course: "BA", mode: "DISTANCE", title: "Distance BA", intro: "Distance-mode BA options currently available through our partner universities." },
  "online-bcom": { course: "B.Com", mode: "ONLINE", title: "Online B.Com", intro: "Online B.Com programs including accounting, finance and analytics specializations." },
  "online-ma": { course: "MA", mode: "ONLINE", title: "Online MA", intro: "Online MA programs in English, Economics, Political Science, Sociology, JMC and more." },
  "online-mcom": { course: "M.Com", mode: "ONLINE", title: "Online M.Com", intro: "Online M.Com programs for commerce graduates." },
  "online-degree-after-12th": { course: "UG", title: "Online Degree after 12th", intro: "Every undergraduate option in one place for students who have completed 12th and want to graduate online." },
};

export const levelGuidance: Record<string, string> = {
  UG: "Undergraduate programs generally require 10+2 (or an equivalent recognised qualification). University-specific criteria, subject requirements and minimum marks vary — our advisor will confirm eligibility for the exact program.",
  PG: "Postgraduate programs generally require a recognised bachelor's degree. Some programs ask for a minimum percentage or work experience — our advisor will confirm the exact criteria.",
  Diploma: "Diploma programs generally require 10+2; confirm exact criteria with our advisor.",
  "PG Diploma": "PG Diploma programs generally require a bachelor's degree; confirm exact criteria with our advisor.",
  Certificate: "Certificate programs have program-specific entry criteria; confirm with our advisor.",
  Doctoral: "Doctoral programs require a master's degree or a bachelor's degree with substantial work experience; the exact criteria for each program are listed on the program page.",
  Other: "Eligibility for this program is confirmed by our advisor.",
};
