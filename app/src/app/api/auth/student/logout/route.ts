import { NextResponse } from "next/server";
import { studentLogout } from "@/lib/auth";
export async function POST() { await studentLogout(); return NextResponse.json({ ok: true }); }
