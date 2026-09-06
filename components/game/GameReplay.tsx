"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Board } from "@/components/board/Board";
import { createEngine } from "@/lib/chess/engine";
import type { BoardOrientation } from "@/lib/chess/types";
import { STARTING_FEN } from "@/lib/chess/types";

type ReplayMove = {
  ply: number;
  san: string;
  fen_after: string;
};

type GameReplayProps = {
  orientation: BoardOrientation;
  moves: ReplayMove[];
  resultLabel: string;
};

export function GameReplay({ orientation, moves, resultLabel }: GameReplayProps) {
  const [ply, setPly] = useState(moves.length);

  const fen = useMemo(() => {
    if (ply <= 0) {
      return STARTING_FEN;
    }
    return moves[ply - 1]?.fen_after ?? STARTING_FEN;
  }, [moves, ply]);

  const engine = useMemo(() => createEngine(fen), [fen]);

  const goTo = useCallback(
    (next: number) => {
      setPly(Math.max(0, Math.min(moves.length, next)));
    },
    [moves.length],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(ply - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(ply + 1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        goTo(moves.length);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, moves.length, ply]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:flex-row lg:items-start">
      <section className="flex flex-1 flex-col items-center gap-4">
        <p className="text-stone-600">{resultLabel}</p>
        <Board
          pieces={engine.board}
          orientation={orientation}
          selectedSquare={null}
          legalTargets={[]}
          inCheckSquare={null}
          onSquareTap={() => undefined}
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onClick={() => goTo(0)}
          >
            Start
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onClick={() => goTo(ply - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onClick={() => goTo(ply + 1)}
          >
            Next
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onClick={() => goTo(moves.length)}
          >
            End
          </button>
        </div>
        <p className="text-xs text-stone-500">
          Arrow keys to step · {ply}/{moves.length}
        </p>
      </section>

      <aside className="w-full rounded-lg border border-stone-200 bg-white p-4 lg:w-64">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Moves
        </h2>
        <div className="space-y-1 text-sm font-mono">
          {moves.length === 0 ? (
            <p className="text-stone-500">No moves.</p>
          ) : (
            Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
              const whitePly = i * 2 + 1;
              const blackPly = i * 2 + 2;
              return (
                <div key={i} className="flex gap-2">
                  <span className="w-6 text-stone-400">{i + 1}.</span>
                  <button
                    type="button"
                    className={[
                      "rounded px-1",
                      ply === whitePly ? "bg-stone-800 text-white" : "hover:bg-stone-100",
                    ].join(" ")}
                    onClick={() => goTo(whitePly)}
                  >
                    {moves[i * 2]?.san ?? ""}
                  </button>
                  {moves[i * 2 + 1] && (
                    <button
                      type="button"
                      className={[
                        "rounded px-1",
                        ply === blackPly ? "bg-stone-800 text-white" : "hover:bg-stone-100",
                      ].join(" ")}
                      onClick={() => goTo(blackPly)}
                    >
                      {moves[i * 2 + 1]?.san}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
