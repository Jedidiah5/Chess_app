import Link from "next/link";
import { OnlineOnly } from "@/components/offline/OnlineOnly";
import { PlatePage } from "@/components/ui/PlatePage";
import { eyebrow } from "@/components/ui/plateStyles";
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
      <PlatePage
        nav={[
          { href: "/games", label: "Archive" },
          { href: "/profile", label: "Profile" },
        ]}
      >
        <div className="mt-8 pb-12">
          <p className={eyebrow}>Top 20 · 5 rated games minimum</p>
          <h1 className="mt-2 font-serif-title text-5xl font-semibold tracking-tight sm:text-6xl">
            Ladder
          </h1>

          {myProfile && isOnboarded(myProfile) && (
            <div className="landing-plate-card mt-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className={eyebrow}>Your standing</p>
                <p className="mt-1 truncate font-serif-title text-2xl font-semibold">
                  {myProfile.username}
                </p>
                <p className="mt-1 font-mono-plate text-[10px] uppercase tracking-[0.14em] text-[#1F1915]/65">
                  {myRank
                    ? `${myRank.rating} rating · ${myRank.games_played} games`
                    : `${myProfile.rating} rating · ${myProfile.games_played} rated games`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {myRank ? (
                  <>
                    <p className="font-cinzel text-5xl font-semibold leading-none">
                      #{myRank.rank}
                    </p>
                    <p className={`mt-1 ${eyebrow}`}>Rank</p>
                  </>
                ) : (
                  <p className="max-w-[9rem] font-mono-plate text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[#1F1915]/65">
                    {untilRanked > 0
                      ? `${untilRanked} more game${untilRanked === 1 ? "" : "s"} to rank`
                      : "Unranked"}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="landing-plate-card mt-6 !p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F1915]/25 text-left">
                  <th className={`w-14 px-4 py-3 ${eyebrow}`}>#</th>
                  <th className={`px-4 py-3 ${eyebrow}`}>Player</th>
                  <th className={`px-4 py-3 text-right ${eyebrow}`}>Rating</th>
                  <th className={`hidden px-4 py-3 text-right sm:table-cell ${eyebrow}`}>
                    Games
                  </th>
                </tr>
              </thead>
              <tbody>
                {top.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center font-mono-plate text-[10px] uppercase tracking-[0.16em] text-[#1F1915]/55"
                    >
                      No ranked players yet
                    </td>
                  </tr>
                ) : (
                  top.map((row) => {
                    const isMe = user?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-[#1F1915]/10 last:border-b-0 ${
                          isMe ? "bg-[#1F1915]/[0.07]" : ""
                        }`}
                      >
                        <td
                          className={`px-4 py-3 font-cinzel font-semibold tabular-nums ${
                            row.rank <= 3 ? "text-xl" : "text-base text-[#1F1915]/60"
                          }`}
                        >
                          {row.rank}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/profile/${row.username}`}
                            className="font-serif-title text-lg font-semibold underline-offset-4 hover:underline"
                          >
                            {row.username}
                          </Link>
                          {isMe && (
                            <span className="ml-2 font-mono-plate text-[8px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/55">
                              You
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-cinzel text-lg font-semibold tabular-nums">
                          {row.rating}
                        </td>
                        <td className="hidden px-4 py-3 text-right font-mono-plate text-[11px] tabular-nums text-[#1F1915]/65 sm:table-cell">
                          {row.games_played}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PlatePage>
    </OnlineOnly>
  );
}
