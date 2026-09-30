import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPlayerGames } from "@/lib/supabase/stats";

type GamesPageProps = {
  searchParams: Promise<{ unrated?: string }>;
};

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

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Game archive</h1>
            <p className="mt-1 text-sm text-stone-600">Your finished games</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link
              href={includeUnrated ? "/games" : "/games?unrated=1"}
              className="text-stone-700 underline-offset-2 hover:underline"
            >
              {includeUnrated ? "Hide unrated" : "Show unrated"}
            </Link>
            <Link href="/play" className="text-stone-700 underline-offset-2 hover:underline">
              Play
            </Link>
          </div>
        </header>

        <ul className="space-y-2">
          {games.length === 0 ? (
            <li className="rounded-lg border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
              No games yet.
            </li>
          ) : (
            games.map((game) => {
              const iAmWhite = game.white_id === user.id;
              const opponent = iAmWhite
                ? game.black?.username ?? "—"
                : game.white?.username ?? "—";

              let outcome = "—";
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

              const before = iAmWhite
                ? game.white_rating_before
                : game.black_rating_before;
              const delta = iAmWhite
                ? game.white_rating_delta
                : game.black_rating_delta;

              let ratingText = "";
              if (game.rated && before !== null && delta !== null) {
                const after = before + delta;
                const sign = delta > 0 ? `+${delta}` : `${delta}`;
                ratingText = `${before} → ${after} (${sign})`;
              }

              return (
                <li key={game.id}>
                  <Link
                    href={`/games/${game.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm hover:border-stone-300"
                  >
                    <div>
                      <p className="font-medium text-stone-900">
                        vs {opponent}{" "}
                        {!game.rated && (
                          <span className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-normal text-stone-500">
                            unrated
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-stone-500">
                        {outcome}
                        {game.reason ? ` · ${game.reason.replaceAll("_", " ")}` : ""}
                      </p>
                    </div>
                    <div className="text-right font-mono text-stone-700">
                      {ratingText || (game.rated ? "—" : "")}
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </main>
  );
}
