import Link from "next/link";
import { OnlineOnly } from "@/components/offline/OnlineOnly";
import { SettingsGearLink } from "@/components/settings/SettingsGear";
import { createClient } from "@/lib/supabase/server";
import {
  fetchLeaderboardTop,
  fetchMyLeaderboardRank,
  gamesUntilRanked,
} from "@/lib/supabase/stats";
import { getProfileById } from "@/lib/supabase/profile";
import { isOnboarded } from "@/types/profile";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const top = await fetchLeaderboardTop(supabase, 20);

  let myRank = null;
  let myProfile = null;
  if (user) {
    myRank = await fetchMyLeaderboardRank(supabase, user.id);
    myProfile = await getProfileById(supabase, user.id);
  }

  const untilRanked =
    myProfile && isOnboarded(myProfile)
      ? gamesUntilRanked(myProfile.games_played)
      : 0;

  return (
    <OnlineOnly feature="The leaderboard">
      <main className="landing-paper relative min-h-dvh overflow-hidden text-[#1F1915] antialiased">
        <div
          className="landing-archival-grain pointer-events-none absolute inset-0 opacity-20"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 py-6 sm:px-8 sm:py-8">
          <header className="landing-double-rule-bottom flex items-center justify-between gap-4 pb-4">
            <Link
              href="/"
              className="font-serif-title text-3xl font-semibold tracking-tight"
            >
              Chess
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/play"
                className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.18em] text-[#1F1915]/65 hover:text-[#1F1915]"
              >
                Play
              </Link>
              <SettingsGearLink />
            </div>
          </header>

          <div className="mt-8">
            <h1 className="font-serif-title text-4xl font-semibold tracking-tight sm:text-5xl">
              Leaderboard
            </h1>
            <p className="mt-2 font-mono-plate text-[10px] uppercase tracking-[0.18em] text-[#1F1915]/60">
              Top 20 by rating · 5 rated games minimum
            </p>
          </div>

          {myProfile && isOnboarded(myProfile) && (
            <div className="landing-plate-card mt-6">
              <p className="font-mono-plate text-[8px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/55">
                Your standing
              </p>
              {myRank ? (
                <p className="mt-2 font-serif-title text-xl font-semibold">
                  Rank #{myRank.rank}
                  <span className="ml-3 font-mono-plate text-[11px] font-normal uppercase tracking-[0.16em] text-[#1F1915]/70">
                    {myRank.rating} Elo · {myRank.games_played}{" "}
                    {myRank.games_played === 1 ? "game" : "games"}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-[#1F1915]">
                  <span className="font-cinzel text-2xl font-semibold">
                    {myProfile.rating}
                  </span>
                  <span className="ml-2 font-mono-plate text-[10px] uppercase tracking-[0.16em] text-[#1F1915]/70">
                    Elo · {myProfile.games_played} rated{" "}
                    {myProfile.games_played === 1 ? "game" : "games"}
                    {untilRanked > 0
                      ? ` · ${untilRanked} more ${untilRanked === 1 ? "game" : "games"} to rank`
                      : ""}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="mt-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#1F1915]/25 text-left">
                  <th className="pb-3 pr-4 font-mono-plate text-[9px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/55">
                    #
                  </th>
                  <th className="pb-3 pr-4 font-mono-plate text-[9px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/55">
                    Player
                  </th>
                  <th className="pb-3 pr-4 font-mono-plate text-[9px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/55">
                    Rating
                  </th>
                  <th className="pb-3 font-mono-plate text-[9px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/55">
                    Games
                  </th>
                </tr>
              </thead>
              <tbody>
                {top.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center font-mono-plate text-[10px] uppercase tracking-[0.18em] text-[#1F1915]/50"
                    >
                      No ranked players yet.
                    </td>
                  </tr>
                ) : (
                  top.map((row, i) => (
                    <tr
                      key={row.id}
                      className={[
                        "border-b border-[#1F1915]/15",
                        user?.id === row.id
                          ? "bg-[#F4EEDB]/60"
                          : i % 2 === 0
                            ? ""
                            : "bg-[#F4EEDB]/30",
                      ].join(" ")}
                    >
                      <td className="py-3 pr-4 font-mono-plate text-[11px] text-[#1F1915]/60">
                        {row.rank}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/profile/${row.username}`}
                          className="font-semibold text-[#1F1915] hover:underline"
                        >
                          {row.username}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 font-cinzel text-lg font-semibold">
                        {row.rating}
                      </td>
                      <td className="py-3 font-mono-plate text-[11px] text-[#1F1915]/60">
                        {row.games_played}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="mt-10 text-center">
            <Link
              href="/play"
              className="font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915]/65 hover:text-[#1F1915]"
            >
              Back to play
            </Link>
          </footer>
        </div>
      </main>
    </OnlineOnly>
  );
}
