"use client";

import { useMemo } from "react";
import { Piece } from "@/components/board/Piece";
import { capturesFor } from "@/lib/chess/material";
import type { BoardPiece, Color, PieceType } from "@/lib/chess/types";

type CapturedPiecesProps = {
  board: BoardPiece[];
  /** The side whose haul is shown — the pieces drawn are the opponent's colour. */
  side: Color;
  align?: "start" | "end";
};

const PIECE_NAME: Record<Exclude<PieceType, "k">, [string, string]> = {
  p: ["pawn", "pawns"],
  n: ["knight", "knights"],
  b: ["bishop", "bishops"],
  r: ["rook", "rooks"],
  q: ["queen", "queens"],
};

export function CapturedPieces({ board, side, align = "start" }: CapturedPiecesProps) {
  const { pieces, lead } = useMemo(() => capturesFor(board, side), [board, side]);
  const pieceColor: Color = side === "w" ? "b" : "w";

  const groups = useMemo(() => {
    const out: { type: Exclude<PieceType, "k">; count: number }[] = [];
    for (const type of pieces) {
      const last = out.at(-1);
      if (last && last.type === type) last.count += 1;
      else out.push({ type, count: 1 });
    }
    return out;
  }, [pieces]);

  const sideName = side === "w" ? "White" : "Black";
  const summary =
    groups.length === 0
      ? `${sideName} has captured nothing yet`
      : `${sideName} has captured ${groups
          .map((g) => `${g.count} ${PIECE_NAME[g.type][g.count === 1 ? 0 : 1]}`)
          .join(", ")}${lead > 0 ? `, up ${lead}` : ""}`;

  return (
    <div
      className={[
        "flex h-7 w-full items-center gap-2.5 px-1",
        align === "end" ? "justify-end" : "justify-start",
      ].join(" ")}
      role="img"
      aria-label={summary}
      title={summary}
    >
      {groups.map(({ type, count }) => (
        <span key={type} className="flex items-center" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <Piece
              key={i}
              type={type}
              color={pieceColor}
              size={24}
              className={i > 0 ? "-ml-3.5" : undefined}
            />
          ))}
        </span>
      ))}
      {lead > 0 ? (
        <span
          className="font-mono-plate text-xs font-semibold tracking-[0.08em]"
          style={{ color: "var(--ink)" }}
          aria-hidden="true"
        >
          +{lead}
        </span>
      ) : null}
    </div>
  );
}
