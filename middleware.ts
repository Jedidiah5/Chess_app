import { NextResponse, type NextRequest } from "next/server";
import { getProfileById } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/middleware";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { isOnboarded } from "@/types/profile";

const PUBLIC_PREFIXES = [
  "/play/local",
  "/play/computer",
  "/offline",
  "/auth/callback",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/play") {
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
    // Mode picker + offline modes are public; online/live games stay gated.
    if (isPublicPath(pathname)) {
      return false;
    }
    return true;
  }
  if (pathname.startsWith("/join/")) {
    return true;
  }
  if (pathname === "/leaderboard" || pathname.startsWith("/leaderboard/")) {
    return true;
  }
  if (pathname === "/games" || pathname.startsWith("/games/")) {
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

  const client = createClient(request);
  const supabase = client.supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // After getUser, which may have refreshed the session cookies.
  const supabaseResponse = client.supabaseResponse;

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
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|stockfish/|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)",
  ],
};
