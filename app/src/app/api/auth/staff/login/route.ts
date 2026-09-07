import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { staffLogin } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`staff-login:${ip}`, 10, 15 * 60 * 1000).ok) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  const s = await staffLogin(parsed.data.email, parsed.data.password);
  if (!s) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  await audit(s, "staff.login", "StaffUser", s.id, undefined, undefined, ip);
  return NextResponse.json({ ok: true, role: s.role });
}
