import { NextResponse } from "next/server";
import { studentLoginSchema } from "@/lib/validation";
import { studentLogin } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`student-login:${clientIp(req)}`, 10, 15 * 60 * 1000).ok) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = studentLoginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your mobile number and password." }, { status: 400 });
  const s = await studentLogin(parsed.data.mobile, parsed.data.password);
  if (!s) return NextResponse.json({ error: "Mobile number or password is incorrect." }, { status: 401 });
  return NextResponse.json({ ok: true });
}
