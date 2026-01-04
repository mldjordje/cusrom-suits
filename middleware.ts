import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ACCESS_TOKEN = process.env.ADMIN_ACCESS_TOKEN;

export function middleware(req: NextRequest) {
  if (!ADMIN_ACCESS_TOKEN) return NextResponse.next();

  const token =
    req.cookies.get("admin_token")?.value ||
    req.headers.get("x-admin-token") ||
    req.nextUrl.searchParams.get("token");

  if (token === ADMIN_ACCESS_TOKEN) {
    if (req.nextUrl.searchParams.has("token")) {
      const cleanUrl = req.nextUrl.clone();
      cleanUrl.searchParams.delete("token");
      const res = NextResponse.redirect(cleanUrl);
      res.cookies.set("admin_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
      });
      return res;
    }
    return NextResponse.next();
  }

  return new NextResponse("Unauthorized", { status: 401 });
}

export const config = {
  matcher: ["/admin/:path*"],
};
