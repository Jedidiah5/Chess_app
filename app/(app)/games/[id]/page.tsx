import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GameReplay } from "@/components/game/GameReplay";
import { RematchButton } from "@/components/game/RematchButton";
import { createClient } from "@/lib/supabase/server";
import { fetchMoves, gameResultLabel } from "@/lib/supabase/games";
import { fetchGameForReplay } from "@/lib/supabase/stats";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GameReplayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/games/${id}`);
  }

  const game = await fetchGameForReplay(supabase, id);
  if (!game) {
    notFound();
  }

  if (user.id !== game.white_id && user.id !== game.black_id) {
    notFound();
  }

  const moves = await fetchMoves(supabase, id);
  const orientation = user.id === game.white_id ? "white" : "black";

  const label =
    game.status === "abandoned"
      ? "Abandoned"
      : gameResultLabel(
          game.result,
          game.reason,
          user.id,
          game.white_id,
        ) ?? "Game over";

  const whiteRel = game.white as { username: string } | { username: string }[] | null;
  const blackRel = game.black as { username: string } | { username: string }[] | null;
  const whiteName = Array.isArray(whiteRel)
    ? whiteRel[0]?.username ?? "White"
    : whiteRel?.username ?? "White";
  const blackName = Array.isArray(blackRel)
    ? blackRel[0]?.username ?? "Black"
    : blackRel?.username ?? "Black";

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            {whiteName} vs {blackName}
          </h1>
          {!game.rated && (
            <span className="mt-1 inline-block rounded bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
              unrated
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {game.status === "finished" && game.black_id && (
            <RematchButton gameId={game.id} />
          )}
          <Link
            href="/games"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700"
          >
            Archive
          </Link>
        </div>
      </div>

      <GameReplay
        orientation={orientation}
        moves={moves.map((move) => ({
          ply: move.ply,
          san: move.san,
          fen_after: move.fen_after,
        }))}
        resultLabel={label}
      />
    </main>
  );
}
