import Link from "next/link";
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
    <main className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Leaderboard</h1>
            <p className="mt-1 text-sm text-stone-600">
              Top 20 by rating · 5 rated games minimum
            </p>
          </div>
          <Link
            href="/play"
            className="text-sm text-stone-700 underline-offset-2 hover:underline"
          >
            Play
          </Link>
        </header>

        {myProfile && isOnboarded(myProfile) && (
          <div className="mb-6 rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Your standing
            </p>
            {myRank ? (
              <p className="mt-1 text-stone-900">
                Rank #{myRank.rank} · {myRank.rating} Elo ·{" "}
                {myRank.games_played} games
              </p>
            ) : (
              <p className="mt-1 text-stone-900">
                {myProfile.rating} Elo · {myProfile.games_played} rated games
                {untilRanked > 0
                  ? ` · ${untilRanked} more game${untilRanked === 1 ? "" : "s"} to rank`
                  : ""}
              </p>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Games</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                    No ranked players yet.
                  </td>
                </tr>
              ) : (
                top.map((row) => (
                  <tr
                    key={row.id}
                    className={[
                      "border-b border-stone-100",
                      user?.id === row.id ? "bg-amber-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 text-stone-500">{row.rank}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/${row.username}`}
                        className="font-medium text-stone-900 hover:underline"
                      >
                        {row.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono">{row.rating}</td>
                    <td className="px-4 py-3 text-stone-600">{row.games_played}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
