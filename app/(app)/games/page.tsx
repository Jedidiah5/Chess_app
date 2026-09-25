import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsGearLink } from "@/components/settings/SettingsGear";
import { createClient } from "@/lib/supabase/server";
import { fetchPlayerGames } from "@/lib/supabase/stats";

type GamesPageProps = {
  searchParams: Promise<{ unrated?: string }>;
};

export default async function GamesArchivePage({
  searchParams,
}: GamesPageProps) {
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

  return (
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

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif-title text-4xl font-semibold tracking-tight sm:text-5xl">
              Game archive
            </h1>
            <p className="mt-2 font-mono-plate text-[10px] uppercase tracking-[0.18em] text-[#1F1915]/60">
              Your finished games
            </p>
          </div>
          <Link
            href={includeUnrated ? "/games" : "/games?unrated=1"}
            className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.18em] text-[#1F1915]/65 hover:text-[#1F1915]"
          >
            {includeUnrated ? "Hide unrated" : "Show unrated"}
          </Link>
        </div>

        <ul className="mt-6 space-y-2">
          {games.length === 0 ? (
            <li className="landing-plate-card py-8 text-center">
              <p className="font-mono-plate text-[10px] uppercase tracking-[0.18em] text-[#1F1915]/50">
                No games yet.
              </p>
            </li>
          ) : (
            games.map((game) => {
              const iAmWhite = game.white_id === user.id;
              const opponent = iAmWhite
                ? game.black?.username ?? "—"
                : game.white?.username ?? "—";

              let outcome = "—";
              let outcomeClass = "text-[#1F1915]/60";
              if (game.status === "abandoned") {
                outcome = "Abandoned";
              } else if (game.result === "draw") {
                outcome = "Draw";
              } else if (
                (game.result === "white" && iAmWhite) ||
                (game.result === "black" && !iAmWhite)
              ) {
                outcome = "Win";
                outcomeClass = "text-[#1F1915]";
              } else if (game.result) {
                outcome = "Loss";
              }

              const before = iAmWhite
                ? game.white_rating_before
                : game.black_rating_before;
              const delta = iAmWhite
                ? game.white_rating_delta
                : game.black_rating_delta;

              let ratingText = "";
              let deltaClass = "text-[#1F1915]/60";
              if (game.rated && before !== null && delta !== null) {
                const after = before + delta;
                const sign = delta > 0 ? `+${delta}` : `${delta}`;
                ratingText = `${before} → ${after} (${sign})`;
                if (delta > 0) deltaClass = "text-[#2d5a3d]";
                else if (delta < 0) deltaClass = "text-[#8c2f22]";
              }

              return (
                <li key={game.id}>
                  <Link
                    href={`/games/${game.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 border border-[#1F1915]/20 bg-[#F4EEDB]/60 px-4 py-3 transition hover:border-[#1F1915]/40 hover:bg-[#F4EEDB]/80"
                  >
                    <div>
                      <p className="font-semibold text-[#1F1915]">
                        vs {opponent}
                        {!game.rated && (
                          <span className="ml-2 font-mono-plate text-[8px] font-normal uppercase tracking-[0.16em] text-[#1F1915]/50">
                            unrated
                          </span>
                        )}
                      </p>
                      <p
                        className={`mt-0.5 font-mono-plate text-[10px] uppercase tracking-[0.14em] ${outcomeClass}`}
                      >
                        {outcome}
                        {game.reason
                          ? ` · ${game.reason.replaceAll("_", " ")}`
                          : ""}
                      </p>
                    </div>
                    <div
                      className={`text-right font-mono-plate text-[11px] ${deltaClass}`}
                    >
                      {ratingText || (game.rated ? "—" : "")}
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>

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
  );
}
