import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/supabase/profile";
import { isOnboarded } from "@/types/profile";

function loginWithError(origin: string, error: string) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // Supabase redirects here with these when the link itself is bad (expired, reused).
  const upstreamError =
    searchParams.get("error_code") ?? searchParams.get("error");
  if (upstreamError) {
    return loginWithError(origin, upstreamError);
  }

  const supabase = await createClient();

  if (tokenHash && type) {
    // Works even when the link is opened in a different browser than the one
    // that requested it (e.g. a phone's mail app).
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      return loginWithError(origin, error.code ?? "auth_callback_failed");
    }
  } else if (code) {
    // PKCE: needs the code verifier cookie set by the browser that asked for the link.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginWithError(origin, error.code ?? "auth_callback_failed");
    }
  } else {
    return loginWithError(origin, "missing_code");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return loginWithError(origin, "no_session");
  }

  const profile = await getProfileById(supabase, user.id);

  if (profile && isOnboarded(profile)) {
    const safeNext =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      next !== "/login" &&
      next !== "/username"
        ? next
        : null;
    const destination = safeNext ?? `/profile/${profile.username}`;
    return NextResponse.redirect(new URL(destination, origin));
  }

  return NextResponse.redirect(new URL("/username", origin));
}
