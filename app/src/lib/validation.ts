import { z } from "zod";

const mobile = z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  mobile,
  whatsapp: mobile.optional().or(z.literal("")),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  qualification: z.string().trim().max(60).optional().or(z.literal("")),
  interestedCourse: z.string().trim().max(80).optional().or(z.literal("")),
  universitySlug: z.string().trim().max(80).optional().or(z.literal("")),
  programSlug: z.string().trim().max(120).optional().or(z.literal("")),
  specialization: z.string().trim().max(120).optional().or(z.literal("")),
  mode: z.enum(["Online", "Distance", "Either"]).optional(),
  budget: z.string().trim().max(40).optional().or(z.literal("")),
  objective: z.string().trim().max(60).optional().or(z.literal("")),
  source: z.string().trim().max(40).default("website"),
  utm: z.object({ source: z.string().max(80).optional(), medium: z.string().max(80).optional(), campaign: z.string().max(120).optional() }).optional(),
  landingPath: z.string().max(200).optional(),
  website: z.string().max(0).optional(), // honeypot — must stay empty
});
export type LeadInput = z.infer<typeof leadSchema>;

export const applicationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  mobile,
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  qualification: z.string().trim().max(60),
  universitySlug: z.string().trim().min(1),
  programSlug: z.string().trim().min(1),
  specialization: z.string().trim().max(120).optional().or(z.literal("")),
});

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const studentLoginSchema = z.object({ mobile, password: z.string().min(1) });
