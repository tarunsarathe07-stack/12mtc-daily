import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/content/config";

export async function updateSession(request: NextRequest) {
  // ─── Mock mode: skip Supabase auth entirely (local dev/demo) ───
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    return NextResponse.next({ request });
  }

  // ─── Mock mode OFF but Supabase not configured: fail CLOSED ───
  // Public pages still render; /admin and app pages are blocked rather
  // than silently running unprotected with placeholder credentials.
  if (!isSupabaseConfigured()) {
    const pathname = request.nextUrl.pathname;
    const isPublic =
      pathname === "/" ||
      pathname.startsWith("/blog") ||
      pathname.startsWith("/api") || // API routes enforce their own guards
      pathname.startsWith("/_next") ||
      pathname.startsWith("/icons") ||
      pathname === "/manifest.json";
    if (isPublic) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const pathname = request.nextUrl.pathname;
  const isPublicPage =
    pathname === "/" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/blog") || // landing + funnel blog are public
    pathname.startsWith("/auth"); // OAuth/email-confirm callback

  // Public pages and API routes must not depend on an auth-network round trip.
  // API routes enforce auth/admin/student ownership inside the route handlers.
  if (isPublicPage || pathname.startsWith("/api")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  // /admin requires login AND an admin/editor role
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const { data: isAdminOrEditor } = await supabase.rpc("is_admin_or_editor");
    if (!isAdminOrEditor) {
      const url = request.nextUrl.clone();
      url.pathname = "/access-denied";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login (except public/auth pages and API routes)
  if (!user && !isAuthPage && !isPublicPage && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
