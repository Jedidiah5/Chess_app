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
};

const stepBtn =
  "border border-[#1F1915]/50 px-3.5 py-2 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915] hover:bg-[#1F1915] hover:text-[#E7DFD2] disabled:pointer-events-none disabled:opacity-35";

const moveBtn = (active: boolean) =>
  `px-1.5 py-0.5 text-left transition ${
    active ? "bg-[#1F1915] text-[#E7DFD2]" : "hover:bg-[#1F1915]/10"
  }`;

export function GameReplay({ orientation, moves }: GameReplayProps) {
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
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <section className="flex flex-1 flex-col items-center gap-4">
        <Board
          pieces={engine.board}
          orientation={orientation}
          selectedSquare={null}
          legalTargets={[]}
          inCheckSquare={null}
          onSquareTap={() => undefined}
        />
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={stepBtn} disabled={ply === 0} onClick={() => goTo(0)}>
            Start
          </button>
          <button type="button" className={stepBtn} disabled={ply === 0} onClick={() => goTo(ply - 1)}>
            Prev
          </button>
          <button
            type="button"
            className={stepBtn}
            disabled={ply === moves.length}
            onClick={() => goTo(ply + 1)}
          >
            Next
          </button>
          <button
            type="button"
            className={stepBtn}
            disabled={ply === moves.length}
            onClick={() => goTo(moves.length)}
          >
            End
          </button>
        </div>
        <p className="font-mono-plate text-[9px] uppercase tracking-[0.18em] text-[#1F1915]/55">
          Arrow keys to step · <span className="tabular-nums">{ply}/{moves.length}</span>
        </p>
      </section>

      <aside className="landing-plate-card w-full lg:w-64">
        <h2 className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.24em] text-[#1F1915]/55">
          Score sheet
        </h2>
        <div className="mt-3 max-h-[60vh] space-y-0.5 overflow-y-auto font-mono-plate text-[12px] text-[#1F1915]">
          {moves.length === 0 ? (
            <p className="text-[#1F1915]/55">No moves.</p>
          ) : (
            Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
              const whitePly = i * 2 + 1;
              const blackPly = i * 2 + 2;
              return (
                <div key={i} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-1">
                  <span className="tabular-nums text-[#1F1915]/45">{i + 1}.</span>
                  <button
                    type="button"
                    className={moveBtn(ply === whitePly)}
                    onClick={() => goTo(whitePly)}
                  >
                    {moves[i * 2]?.san ?? ""}
                  </button>
                  {moves[i * 2 + 1] && (
                    <button
                      type="button"
                      className={moveBtn(ply === blackPly)}
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
