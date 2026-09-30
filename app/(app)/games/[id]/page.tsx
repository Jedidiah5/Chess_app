import { notFound, redirect } from "next/navigation";
import { GameReplay } from "@/components/game/GameReplay";
import { RematchButton } from "@/components/game/RematchButton";
import { CacheOnlineGameEffect } from "@/components/offline/CacheOnlineGameEffect";
import { PlatePage } from "@/components/ui/PlatePage";
import { eyebrow } from "@/components/ui/plateStyles";
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
    <PlatePage
      width="max-w-5xl"
      nav={[
        { href: "/games", label: "Archive" },
        { href: "/profile", label: "Profile" },
      ]}
    >
      <CacheOnlineGameEffect
        id={game.id}
        whiteUsername={whiteName}
        blackUsername={blackName}
        result={game.result}
        reason={game.reason}
        rated={game.rated}
        fen={game.current_fen}
        endedAt={game.ended_at}
        moves={moves.map((move) => ({
          ply: move.ply,
          san: move.san,
          uci: move.uci,
          fen_after: move.fen_after,
        }))}
      />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={eyebrow}>
            {label}
            {game.rated ? " · Rated" : " · Unrated"}
          </p>
          <h1 className="mt-2 font-serif-title text-4xl font-semibold tracking-tight sm:text-5xl">
            {whiteName} <span className="text-[#1F1915]/45">vs</span> {blackName}
          </h1>
        </div>
        {game.status === "finished" && game.black_id && (
          <RematchButton gameId={game.id} />
        )}
      </div>

      <div className="mt-8 pb-12">
        <GameReplay
          orientation={orientation}
          moves={moves.map((move) => ({
            ply: move.ply,
            san: move.san,
            fen_after: move.fen_after,
          }))}
        />
      </div>
    </PlatePage>
  );
}
