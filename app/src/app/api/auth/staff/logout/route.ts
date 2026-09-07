import { NextResponse } from "next/server";
import { staffLogout } from "@/lib/auth";
export async function POST() { await staffLogout(); return NextResponse.json({ ok: true }); }
