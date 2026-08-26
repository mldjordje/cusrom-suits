import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function safeRedirectTarget(origin: string, next: string | null): URL {
  const fallback = "/nalog";
  const raw = (next || fallback).trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/api/")) {
    return new URL(fallback, origin);
  }
  return new URL(raw, origin);
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      new URL(`/nalog/prijava?error=oauth&msg=${encodeURIComponent("Supabase nije podesen.")}`, origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/nalog/prijava?error=oauth", origin));
  }

  const target = safeRedirectTarget(origin, next);
  const response = NextResponse.redirect(target);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/nalog/prijava?error=oauth&msg=${encodeURIComponent(error.message)}`, origin),
    );
  }

  return response;
}
