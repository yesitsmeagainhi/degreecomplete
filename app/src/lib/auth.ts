import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { StaffRole } from "@prisma/client";
import { dbAdmin, dbPublic } from "./db";

/**
 * Stateless sessions: HS256 JWT in an httpOnly, SameSite=Lax, Secure cookie.
 * Two independent cookies so a student session can never be mistaken for a staff session.
 */
const enc = new TextEncoder();
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (>= 32 chars)");
  return enc.encode(s);
};
const ttlHours = () => Number(process.env.SESSION_TTL_HOURS ?? 12);

export type StaffSession = { kind: "staff"; id: string; name: string; email: string; role: StaffRole };
export type StudentSession = { kind: "student"; id: string; name: string; mobile: string };

const COOKIE = { staff: "dc_staff", student: "dc_student" } as const;

async function sign(payload: object) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlHours()}h`)
    .sign(secret());
}

async function setCookie(name: string, token: string) {
  (await cookies()).set(name, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ttlHours() * 3600,
  });
}

async function read<T>(name: string): Promise<T | null> {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as T;
  } catch {
    return null;
  }
}

// ---- staff --------------------------------------------------------------------------
export async function staffLogin(email: string, password: string) {
  const user = await dbAdmin.staffUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const session: StaffSession = { kind: "staff", id: user.id, name: user.name, email: user.email, role: user.role };
  await setCookie(COOKIE.staff, await sign(session));
  return session;
}
export const getStaff = () => read<StaffSession>(COOKIE.staff).then((s) => (s?.kind === "staff" ? s : null));
export const staffLogout = async () => (await cookies()).delete(COOKIE.staff);

// ---- student -------------------------------------------------------------------------
export async function studentLogin(mobile: string, password: string) {
  const user = await dbPublic.studentUser.findUnique({ where: { mobile: normaliseMobile(mobile) } });
  if (!user) return null;
  if (!(await bcrypt.compare(password, user.passwordHash))) return null;
  return issueStudentSession(user);
}
export async function issueStudentSession(user: { id: string; name: string; mobile: string }) {
  const session: StudentSession = { kind: "student", id: user.id, name: user.name, mobile: user.mobile };
  await setCookie(COOKIE.student, await sign(session));
  return session;
}
export const getStudent = () => read<StudentSession>(COOKIE.student).then((s) => (s?.kind === "student" ? s : null));
export const studentLogout = async () => (await cookies()).delete(COOKIE.student);

export const normaliseMobile = (m: string) => m.replace(/\D/g, "").replace(/^91(\d{10})$/, "$1");
export const hashPassword = (p: string) => bcrypt.hash(p, 12);
