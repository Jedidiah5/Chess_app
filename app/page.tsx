import { LandingHero } from "@/components/marketing/LandingHero";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getProfileById } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { isOnboarded } from "@/types/profile";

async function getDashboardHref(): Promise<string | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = await getProfileById(supabase, user.id);
    return profile && isOnboarded(profile)
      ? `/profile/${profile.username}`
      : "/username";
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const dashboardHref = await getDashboardHref();
  return <LandingHero dashboardHref={dashboardHref} />;
}
