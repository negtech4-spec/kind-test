import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set("kp_admin_auth", "", { path: "/", maxAge: 0 });
  return res;
}
