// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (path.startsWith("/staff")) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(redirectUrl);
    }

    const protectedReaderPaths = [
      "/reader/account",
      "/reader/favorites",
      "/reader/settings",
    ];

    const isProtectedPath = protectedReaderPaths.some(
      (protectedPath) =>
        path === protectedPath || path.startsWith(`${protectedPath}/`),
    );

    if (isProtectedPath) {
      const redirectUrl = new URL("/auth/login", request.url);
      redirectUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  const userId = user.id;
  let userRole = null;

  const { data: readerData } = await supabaseAdmin
    .from("reader")
    .select("reader_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (readerData) userRole = "reader";

  const { data: staffData } = await supabaseAdmin
    .from("staff")
    .select("staff_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (staffData) userRole = "staff";

  if (path.startsWith("/staff") && userRole !== "staff") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (path.startsWith("/reader") && userRole !== "reader") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
