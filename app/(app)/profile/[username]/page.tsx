import Link from "next/link";
import { notFound } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ProfilePawn } from "@/components/profile/ProfilePawn";
import { PlatePage } from "@/components/ui/PlatePage";
import { ghostBtn, primaryBtn, secondaryBtn } from "@/components/ui/plateStyles";
import { getProfileByUsername } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import {
  currentStreak,
  fetchHeadToHead,
  fetchPlayerGames,
  winRate,
} from "@/lib/supabase/stats";
import { isOnboarded } from "@/types/profile";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-2 py-3 text-center">
      <dd className="font-serif-title text-3xl font-semibold leading-none text-[#1F1915] sm:text-4xl">
        {value}
      </dd>
      <dt className="mt-2 font-mono-plate text-[8px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/55">
        {label}
      </dt>
    </div>
  );
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username: usernameParam } = await params;
  const supabase = await createClient();

  const profile = await getProfileByUsername(supabase, usernameParam);

  if (!profile || !isOnboarded(profile)) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;
  const rate = winRate(profile);

  const ratedGames = await fetchPlayerGames(supabase, profile.id, {
    includeUnrated: false,
  });
  const streak = currentStreak(ratedGames, profile.id);

  let h2h = null;
  if (user && !isOwnProfile) {
    h2h = await fetchHeadToHead(supabase, user.id, profile.id);
  }

  const summary = [
    `${profile.games_played} rated ${profile.games_played === 1 ? "game" : "games"}`,
    rate !== null ? `${rate}% win rate` : null,
    streak.type && streak.count > 0 ? `${streak.count}${streak.type} streak` : null,
  ].filter(Boolean);

  return (
    <PlatePage width="max-w-5xl" nav={[{ href: "/leaderboard", label: "Ladder" }]}>
        <div className="mt-2 grid items-center gap-2 md:mt-8 md:grid-cols-[1fr_1.1fr] md:gap-10">
          <section className="relative" aria-hidden>
            <ProfilePawn className="h-[150px] w-full sm:h-[300px] md:h-[500px]" />
          </section>

          <section className="flex flex-col pb-10">
            <div className="flex items-center gap-4">
              {profile.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-14 w-14 shrink-0 border border-[#1F1915]/40 object-cover grayscale sepia-[.35]"
                />
              )}
              <div className="min-w-0">
                <p className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.24em] text-[#1F1915]/55">
                  {isOwnProfile ? "Your profile" : "Player"}
                </p>
                <h1 className="truncate font-serif-title text-5xl font-semibold tracking-tight sm:text-6xl">
                  {profile.username}
                </h1>
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-3 sm:mt-5">
              <span className="font-cinzel text-4xl font-semibold leading-none sm:text-6xl">
                {profile.rating}
              </span>
              <span className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/55">
                Rating
              </span>
            </div>

            <div className="landing-plate-card order-1 mt-6 md:order-none">
              <dl className="grid grid-cols-3 divide-x divide-[#1F1915]/20">
                <Stat label="Wins" value={profile.wins} />
                <Stat label="Losses" value={profile.losses} />
                <Stat label="Draws" value={profile.draws} />
              </dl>
              <p className="mt-2 border-t border-[#1F1915]/20 pt-3 text-center font-mono-plate text-[10px] uppercase tracking-[0.16em] text-[#1F1915]/70">
                {summary.join(" · ")}
              </p>
            </div>

            {h2h && h2h.total > 0 && (
              <div className="order-1 mt-4 border border-[#1F1915]/25 bg-[#F4EEDB]/70 px-4 py-3 md:order-none">
                <p className="font-mono-plate text-[8px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/55">
                  Your record against {profile.username}
                </p>
                <p className="mt-1 font-serif-title text-2xl font-semibold">
                  {h2h.wins}W · {h2h.losses}L · {h2h.draws}D
                  <span className="ml-2 font-mono-plate text-[10px] font-normal uppercase tracking-[0.16em] text-[#1F1915]/60">
                    {h2h.total} {h2h.total === 1 ? "game" : "games"}
                  </span>
                </p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 md:mt-6">
              {isOwnProfile ? (
                <>
                  <Link href="/play/online" className={`${primaryBtn} col-span-2`}>
                    Play online
                  </Link>
                  <Link href="/play/computer" className={`${secondaryBtn} col-span-2 sm:col-span-1`}>
                    Play with computer
                  </Link>
                  <Link href="/play/local" className={`${secondaryBtn} col-span-2 sm:col-span-1`}>
                    Pass and play
                  </Link>
                  <Link href="/games" className={ghostBtn}>
                    Game archive
                  </Link>
                  <SignOutButton className={ghostBtn} />
                </>
              ) : (
                <>
                  <Link href="/play/online" className={`${primaryBtn} col-span-2`}>
                    Challenge a game
                  </Link>
                  <Link href="/leaderboard" className={ghostBtn}>
                    Leaderboard
                  </Link>
                  <Link href="/profile" className={ghostBtn}>
                    My profile
                  </Link>
                </>
              )}
            </div>
          </section>
        </div>
    </PlatePage>
  );
}
