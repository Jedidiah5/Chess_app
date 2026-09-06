import { NextResponse, type NextRequest } from "next/server";
import { getProfileById } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/middleware";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { isOnboarded } from "@/types/profile";

const PUBLIC_PREFIXES = ["/play/local", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAppPath(pathname: string): boolean {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return true;
  }
  if (pathname === "/play" || pathname.startsWith("/play/")) {
    return pathname !== "/play/local" && !pathname.startsWith("/play/local/");
  }
  if (pathname.startsWith("/join/")) {
    return true;
  }
  return false;
}

function redirectWithSession(
  url: URL,
  supabaseResponse: NextResponse,
): NextResponse {
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  const { supabase, supabaseResponse } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    profile = await getProfileById(supabase, user.id);
  }

  const onboarded = profile !== null && isOnboarded(profile);

  if (!user) {
    if (isAppPath(pathname) || pathname === "/username") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return redirectWithSession(loginUrl, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (!onboarded) {
    const allowedWithoutUsername =
      pathname === "/username" ||
      pathname.startsWith("/auth/callback") ||
      isPublicPath(pathname);

    if (!allowedWithoutUsername) {
      const usernameUrl = request.nextUrl.clone();
      usernameUrl.pathname = "/username";
      usernameUrl.search = "";
      return redirectWithSession(usernameUrl, supabaseResponse);
    }
  }

  if (profile && isOnboarded(profile) && pathname === "/username") {
    const profileUrl = request.nextUrl.clone();
    profileUrl.pathname = `/profile/${profile.username}`;
    profileUrl.search = "";
    return redirectWithSession(profileUrl, supabaseResponse);
  }

  if (profile && isOnboarded(profile) && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next");
    const profileUrl = request.nextUrl.clone();
    profileUrl.pathname =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : `/profile/${profile.username}`;
    profileUrl.search = "";
    return redirectWithSession(profileUrl, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
