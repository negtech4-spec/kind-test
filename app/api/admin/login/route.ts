import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_MAX_AGE,
  AUTH_COOKIE,
  createAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword || !isAdminAuthConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Admin access has not been securely configured." },
        { status: 503 }
      );
    }

    if (password !== correctPassword) {
      return NextResponse.json(
        { ok: false, error: "Incorrect password." },
        { status: 401 }
      );
    }

    const session = await createAdminSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Admin session could not be created." },
        { status: 503 }
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
}
