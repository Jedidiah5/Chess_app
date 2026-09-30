import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatePage } from "@/components/ui/PlatePage";
import { eyebrow } from "@/components/ui/plateStyles";
import { createClient } from "@/lib/supabase/server";
import { fetchPlayerGames } from "@/lib/supabase/stats";

type GamesPageProps = {
  searchParams: Promise<{ unrated?: string }>;
};

type Outcome = "Win" | "Loss" | "Draw" | "Abandoned" | "—";

const OUTCOME_MARK: Record<Outcome, { letter: string; className: string }> = {
  Win: { letter: "W", className: "border-[#1F1915] bg-[#1F1915] text-[#E7DFD2]" },
  Loss: { letter: "L", className: "border-[#1F1915]/60 text-[#1F1915]" },
  Draw: { letter: "D", className: "border-[#1F1915]/40 bg-[#1F1915]/10 text-[#1F1915]" },
  Abandoned: { letter: "A", className: "border-dashed border-[#1F1915]/40 text-[#1F1915]/55" },
  "—": { letter: "·", className: "border-[#1F1915]/30 text-[#1F1915]/55" },
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function GamesArchivePage({ searchParams }: GamesPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/games");
  }

  const params = await searchParams;
  const includeUnrated = params.unrated === "1";
  const games = await fetchPlayerGames(supabase, user.id, { includeUnrated });

  const filterTab = (active: boolean) =>
    `px-4 py-2 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] transition ${
      active ? "bg-[#1F1915] text-[#E7DFD2]" : "text-[#1F1915]/70 hover:text-[#1F1915]"
    }`;

  return (
    <PlatePage
      nav={[
        { href: "/leaderboard", label: "Ladder" },
        { href: "/profile", label: "Profile" },
      ]}
    >
      <div className="mt-8 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>Your finished games</p>
            <h1 className="mt-2 font-serif-title text-5xl font-semibold tracking-tight sm:text-6xl">
              Archive
            </h1>
          </div>
          <div className="grid grid-cols-2 border border-[#1F1915]/40">
            <Link href="/games" className={filterTab(!includeUnrated)}>
              Rated
            </Link>
            <Link href="/games?unrated=1" className={filterTab(includeUnrated)}>
              All games
            </Link>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="landing-plate-card mt-6 py-10 text-center">
            <p className="font-serif-title text-2xl font-semibold">No games yet</p>
            <p className="mt-2 font-mono-plate text-[10px] uppercase tracking-[0.16em] text-[#1F1915]/60">
              {includeUnrated
                ? "Finished games will be filed here"
                : "Rated games will be filed here"}
            </p>
            <Link
              href="/play/online"
              className="mt-5 inline-flex border border-[#1F1915] bg-[#1F1915] px-5 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.2em] text-[#E7DFD2] transition hover:bg-[#2D241E]"
            >
              Play online
            </Link>
          </div>
        ) : (
          <ul className="landing-plate-card mt-6 !p-0">
            {games.map((game) => {
              const iAmWhite = game.white_id === user.id;
              const opponent = iAmWhite
                ? game.black?.username ?? "—"
                : game.white?.username ?? "—";

              let outcome: Outcome = "—";
              if (game.status === "abandoned") {
                outcome = "Abandoned";
              } else if (game.result === "draw") {
                outcome = "Draw";
              } else if (
                (game.result === "white" && iAmWhite) ||
                (game.result === "black" && !iAmWhite)
              ) {
                outcome = "Win";
              } else if (game.result) {
                outcome = "Loss";
              }
              const mark = OUTCOME_MARK[outcome];

              const before = iAmWhite
                ? game.white_rating_before
                : game.black_rating_before;
              const delta = iAmWhite
                ? game.white_rating_delta
                : game.black_rating_delta;
              const hasRating = game.rated && before !== null && delta !== null;

              const meta = [
                outcome,
                game.reason ? game.reason.replaceAll("_", " ") : null,
                formatDate(game.ended_at ?? game.created_at),
              ].filter(Boolean);

              return (
                <li key={game.id} className="border-b border-[#1F1915]/10 last:border-b-0">
                  <Link
                    href={`/games/${game.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-[#1F1915]/[0.04]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center border font-cinzel text-base font-semibold ${mark.className}`}
                      aria-label={outcome}
                    >
                      {mark.letter}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif-title text-lg font-semibold leading-tight">
                        vs {opponent}
                        {!game.rated && (
                          <span className="ml-2 border border-[#1F1915]/30 px-1.5 py-0.5 align-middle font-mono-plate text-[8px] font-bold uppercase tracking-[0.18em] text-[#1F1915]/60">
                            Unrated
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate font-mono-plate text-[9px] uppercase tracking-[0.14em] text-[#1F1915]/60">
                        {meta.join(" · ")}
                      </p>
                    </div>
                    {hasRating && (
                      <div className="shrink-0 text-right">
                        <p className="font-cinzel text-lg font-semibold leading-none tabular-nums">
                          {before + delta}
                        </p>
                        <p
                          className={`mt-1 font-mono-plate text-[10px] font-bold tabular-nums ${
                            delta > 0
                              ? "text-[#1F1915]"
                              : delta < 0
                                ? "text-red-800"
                                : "text-[#1F1915]/55"
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </p>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PlatePage>
  );
}
