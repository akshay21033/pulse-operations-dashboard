import { NextResponse } from "next/server";
import { ROLE_COOKIE, getRole, parseRole } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ role: await getRole() }, { headers: { "Cache-Control": "no-store" } });
}

/** Mock sign-in: sets the role cookie. There is deliberately no real authentication. */
export async function POST(request: Request) {
  const body: { role?: unknown } | null = await request.json().catch(() => null);
  if (body?.role !== "viewer" && body?.role !== "manager") {
    return NextResponse.json({ error: 'Role must be "viewer" or "manager".' }, { status: 400 });
  }
  const role = parseRole(body.role);
  const res = NextResponse.json({ role });
  res.cookies.set(ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
