import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/supabase/profile";
import { isOnboarded } from "@/types/profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(loginUrl);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", origin));
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

  return NextResponse.redirect(new URL("/login", origin));
}
