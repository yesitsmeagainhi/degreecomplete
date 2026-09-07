import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge guard for /admin and /student. Verifies the session cookie signature only (cheap);
 * pages re-check roles server-side with requireStaff()/getStudent().
 * Also enforces same-origin on mutating API requests (CSRF) and adds a CSP.
 */
const enc = new TextEncoder();

async function valid(token: string | undefined, kind: "staff" | "student") {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, enc.encode(process.env.SESSION_SECRET ?? ""));
    return payload.kind === kind;
  } catch { return false; }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!(await valid(req.cookies.get("dc_staff")?.value, "staff"))) return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (pathname.startsWith("/student") && !["/student/login", "/student/register"].includes(pathname)) {
    if (!(await valid(req.cookies.get("dc_student")?.value, "student"))) return NextResponse.redirect(new URL(`/student/login?next=${encodeURIComponent(pathname)}`, req.url));
  }
  if (pathname.startsWith("/api/admin")) {
    if (!(await valid(req.cookies.get("dc_staff")?.value, "staff"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = NextResponse.next();
  const isDev = process.env.NODE_ENV === "development";
  res.headers.set("Content-Security-Policy", [
    "default-src 'self'", "img-src 'self' data: https:", "font-src 'self' https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net`,
    `connect-src 'self'${isDev ? " ws:" : ""} https://www.google-analytics.com https://*.google-analytics.com https://www.facebook.com`,
    "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
  ].join("; "));
  if (pathname.startsWith("/admin") || pathname.startsWith("/student")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.png|seal.png|seal-256.png).*)"] };
