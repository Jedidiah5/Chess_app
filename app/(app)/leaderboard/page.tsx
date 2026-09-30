import Link from "next/link";
import { LiveLadderRefresh } from "@/components/leaderboard/LiveLadderRefresh";
import { OnlineOnly } from "@/components/offline/OnlineOnly";
import { PlatePage } from "@/components/ui/PlatePage";
import { eyebrow } from "@/components/ui/plateStyles";
import { createClient } from "@/lib/supabase/server";
import {
  RANKED_MIN_GAMES,
  fetchLeaderboardTop,
  fetchMyLeaderboardRank,
  fetchPlayersByTrophies,
  fetchProvisionalPlayers,
  gamesUntilRanked,
  type ProvisionalRow,
} from "@/lib/supabase/stats";
import { getProfileById } from "@/lib/supabase/profile";
import { isOnboarded } from "@/types/profile";

function TrophyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </svg>
  );
}

function RankProgress({ played }: { played: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: RANKED_MIN_GAMES }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-3 border border-[#1F1915]/40 ${i < played ? "bg-[#1F1915]" : ""}`}
        />
      ))}
    </div>
  );
}

function YouTag() {
  return (
    <span className="ml-2 font-mono-plate text-[8px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/55">
      You
    </span>
  );
}

function PlayerList({
  players,
  meId,
  showProgress,
}: {
  players: ProvisionalRow[];
  meId: string | undefined;
  showProgress: boolean;
}) {
  return (
    <ul className="landing-plate-card mt-4 !p-0">
      {players.map((row) => {
        const isMe = meId === row.id;
        return (
          <li
            key={row.id}
            className={`flex items-center gap-4 border-b border-[#1F1915]/10 px-4 py-3 last:border-b-0 ${
              isMe ? "bg-[#1F1915]/[0.07]" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${row.username}`}
                className="font-serif-title text-lg font-semibold underline-offset-4 hover:underline"
              >
                {row.username}
              </Link>
              {isMe && <YouTag />}
              {showProgress && (
                <div className="mt-1.5 flex items-center gap-2">
                  <RankProgress played={row.games_played} />
                  <span className="font-mono-plate text-[9px] uppercase tracking-[0.14em] text-[#1F1915]/60">
                    {gamesUntilRanked(row.games_played)} more to rank
                  </span>
                </div>
              )}
            </div>
            <p className="flex shrink-0 items-center gap-1.5 font-cinzel text-lg font-semibold tabular-nums">
              <TrophyIcon className="h-4 w-4 text-[#1F1915]/55" />
              {row.rating}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const myProfile = user ? await getProfileById(supabase, user.id) : null;
  const me = myProfile && isOnboarded(myProfile) ? myProfile : null;
  const viewerRanked = me !== null && me.games_played >= RANKED_MIN_GAMES;

  return (
    <OnlineOnly feature="The leaderboard">
      <LiveLadderRefresh />
      <PlatePage
        nav={[
          { href: "/games", label: "Archive" },
          { href: "/profile", label: "Profile" },
        ]}
      >
        <div className="mt-8 pb-12">
          <p className={`flex items-center gap-2 ${eyebrow}`}>
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1F1915]/50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1F1915]" />
            </span>
            Live
          </p>
          <h1 className="mt-2 font-serif-title text-5xl font-semibold tracking-tight sm:text-6xl">
            Ladder
          </h1>

          {viewerRanked ? (
            <RankedView meId={user?.id} supabase={supabase} />
          ) : (
            <UnrankedView me={me} meId={user?.id} supabase={supabase} />
          )}
        </div>
      </PlatePage>
    </OnlineOnly>
  );
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function UnrankedView({
  me,
  meId,
  supabase,
}: {
  me: { username: string; rating: number; games_played: number } | null;
  meId: string | undefined;
  supabase: ServerClient;
}) {
  const players = await fetchPlayersByTrophies(supabase, 50);
  const remaining = me ? gamesUntilRanked(me.games_played) : RANKED_MIN_GAMES;

  return (
    <>
      {me && (
        <div className="landing-plate-card mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className={eyebrow}>Your trophies</p>
              <p className="mt-1 flex items-center gap-2 font-cinzel text-5xl font-semibold leading-none tabular-nums">
                <TrophyIcon className="h-8 w-8 text-[#1F1915]/70" />
                {me.rating}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-cinzel text-3xl font-semibold leading-none tabular-nums">
                {me.games_played}/{RANKED_MIN_GAMES}
              </p>
              <p className={`mt-1 ${eyebrow}`}>Rated games</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-[#1F1915]/20 pt-3">
            <RankProgress played={me.games_played} />
            <p className="font-mono-plate text-[10px] uppercase tracking-[0.14em] text-[#1F1915]/70">
              Play {remaining} more rated game{remaining === 1 ? "" : "s"} to unlock ranks
            </p>
          </div>
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif-title text-3xl font-semibold tracking-tight">Players</h2>
          <p className={eyebrow}>By trophies</p>
        </div>
        {players.length === 0 ? (
          <p className="landing-plate-card mt-4 py-8 text-center font-mono-plate text-[10px] uppercase tracking-[0.16em] text-[#1F1915]/55">
            No players yet
          </p>
        ) : (
          <PlayerList players={players} meId={meId} showProgress={false} />
        )}
      </section>
    </>
  );
}

async function RankedView({
  meId,
  supabase,
}: {
  meId: string | undefined;
  supabase: ServerClient;
}) {
  const [top, provisional, myRank] = await Promise.all([
    fetchLeaderboardTop(supabase, 20),
    fetchProvisionalPlayers(supabase, 20),
    meId ? fetchMyLeaderboardRank(supabase, meId) : Promise.resolve(null),
  ]);

  return (
    <>
      {myRank && (
        <div className="landing-plate-card mt-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className={eyebrow}>Your standing</p>
            <p className="mt-1 truncate font-serif-title text-2xl font-semibold">
              {myRank.username}
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-mono-plate text-[10px] uppercase tracking-[0.14em] text-[#1F1915]/65">
              <TrophyIcon className="h-3.5 w-3.5" />
              {myRank.rating} trophies · {myRank.games_played} games
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-cinzel text-5xl font-semibold leading-none">#{myRank.rank}</p>
            <p className={`mt-1 ${eyebrow}`}>Rank</p>
          </div>
        </div>
      )}

      <p className={`mt-8 ${eyebrow}`}>Top 20 · {RANKED_MIN_GAMES} rated games to rank</p>
      <div className="landing-plate-card mt-3 !p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1F1915]/25 text-left">
              <th className={`w-14 px-4 py-3 ${eyebrow}`}>#</th>
              <th className={`px-4 py-3 ${eyebrow}`}>Player</th>
              <th className={`px-4 py-3 text-right ${eyebrow}`}>Trophies</th>
              <th className={`hidden px-4 py-3 text-right sm:table-cell ${eyebrow}`}>Games</th>
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
                const isMe = meId === row.id;
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
                      {isMe && <YouTag />}
                    </td>
                    <td className="px-4 py-3 text-right font-cinzel text-lg font-semibold tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <TrophyIcon className="h-4 w-4 text-[#1F1915]/55" />
                        {row.rating}
                      </span>
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

      {provisional.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif-title text-3xl font-semibold tracking-tight">
              Provisional
            </h2>
            <p className={eyebrow}>Not yet ranked</p>
          </div>
          <PlayerList players={provisional} meId={meId} showProgress />
        </section>
      )}
    </>
  );
}
