import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export function createClient(request: NextRequest) {
  const { url, anonKey } = requireSupabaseEnv();
  const state = { response: NextResponse.next({ request }) };

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        state.response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          state.response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Read lazily: setAll runs during auth calls, after this function returns.
  return {
    supabase,
    get supabaseResponse() {
      return state.response;
    },
  };
}
