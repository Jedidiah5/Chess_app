"use client";

import { useCallback, useMemo } from "react";
import type { BoardOrientation, BoardPiece, Color, Square } from "@/lib/chess/types";
import {
  FILES,
  RANKS,
  coordsToSquare,
  squareToCoords,
} from "@/lib/chess/types";
import { Piece } from "./Piece";

type BoardProps = {
  pieces: BoardPiece[];
  orientation: BoardOrientation;
  selectedSquare: Square | null;
  legalTargets: Square[];
  inCheckSquare: Square | null;
  onSquareTap: (square: Square) => void;
};

type DisplaySquare = {
  square: Square;
  file: number;
  rank: number;
  isLight: boolean;
  showFile: boolean;
  showRank: boolean;
  fileLabel: string;
  rankLabel: string;
};

function buildDisplaySquares(orientation: BoardOrientation): DisplaySquare[] {
  const squares: DisplaySquare[] = [];

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const fileIndex = orientation === "white" ? col : 7 - col;
      const rankIndex = orientation === "white" ? 7 - row : row;
      const file = FILES[fileIndex];
      const rank = RANKS[rankIndex];
      const square = coordsToSquare(fileIndex, rankIndex);
      const isLight = (fileIndex + rankIndex) % 2 === 0;

      squares.push({
        square,
        file: col,
        rank: row,
        isLight,
        showFile: row === 7,
        showRank: col === 0,
        fileLabel: file,
        rankLabel: rank,
      });
    }
  }

  return squares;
}

function pieceAt(pieces: BoardPiece[], square: Square): BoardPiece | undefined {
  return pieces.find((piece) => piece.square === square);
}

function displayPosition(
  square: Square,
  orientation: BoardOrientation,
): { file: number; rank: number } {
  const { file, rank } = squareToCoords(square);
  if (orientation === "white") {
    return { file, rank: 7 - rank };
  }
  return { file: 7 - file, rank };
}

export function Board({
  pieces,
  orientation,
  selectedSquare,
  legalTargets,
  inCheckSquare,
  onSquareTap,
}: BoardProps) {
  const displaySquares = useMemo(
    () => buildDisplaySquares(orientation),
    [orientation],
  );

  const legalTargetSet = useMemo(
    () => new Set(legalTargets),
    [legalTargets],
  );

  const handleTap = useCallback(
    (square: Square) => {
      onSquareTap(square);
    },
    [onSquareTap],
  );

  return (
    <div className="w-full max-w-[min(90vw,560px)]">
      <div
        className="relative grid aspect-square w-full grid-cols-8 grid-rows-8 border-2 border-stone-700"
        role="grid"
        aria-label="Chess board"
      >
        {displaySquares.map((sq) => {
          const isSelected = selectedSquare === sq.square;
          const isLegalTarget = legalTargetSet.has(sq.square);
          const isCheck = inCheckSquare === sq.square;

          return (
            <button
              key={sq.square}
              type="button"
              className={[
                "square relative aspect-square w-full border-0 p-0",
                sq.isLight ? "bg-amber-100" : "bg-amber-700",
                isSelected ? "ring-4 ring-inset ring-blue-500" : "",
                isLegalTarget ? "ring-4 ring-inset ring-emerald-500" : "",
                isCheck ? "bg-red-400" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`Square ${sq.square}`}
              onClick={() => handleTap(sq.square)}
            >
              {sq.showRank && (
                <span
                  className={[
                    "pointer-events-none absolute left-1 top-1 text-[10px] font-medium leading-none",
                    sq.isLight ? "text-amber-700/70" : "text-amber-100/70",
                  ].join(" ")}
                >
                  {sq.rankLabel}
                </span>
              )}
              {sq.showFile && (
                <span
                  className={[
                    "pointer-events-none absolute bottom-1 right-1 text-[10px] font-medium leading-none",
                    sq.isLight ? "text-amber-700/70" : "text-amber-100/70",
                  ].join(" ")}
                >
                  {sq.fileLabel}
                </span>
              )}
            </button>
          );
        })}

        {pieces.map((piece) => {
          const { file, rank } = displayPosition(piece.square, orientation);
          const isSelected = selectedSquare === piece.square;

          return (
            <button
              key={`${piece.color}-${piece.type}-${piece.square}`}
              type="button"
              className={[
                "piece pointer-events-auto absolute left-0 top-0 flex h-[12.5%] w-[12.5%] items-center justify-center border-0 bg-transparent p-1",
                isSelected ? "z-20" : "z-10",
              ].join(" ")}
              style={{
                transform: `translate3d(${file * 100}%, ${rank * 100}%, 0)`,
              }}
              aria-label={`${piece.color === "w" ? "White" : "Black"} ${piece.type} on ${piece.square}`}
              onClick={(event) => {
                event.stopPropagation();
                handleTap(piece.square);
              }}
            >
              <Piece type={piece.type} color={piece.color} className="h-full w-full" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function findKingSquare(
  pieces: BoardPiece[],
  color: Color,
): Square | null {
  const king = pieces.find((piece) => piece.type === "k" && piece.color === color);
  return king?.square ?? null;
}
