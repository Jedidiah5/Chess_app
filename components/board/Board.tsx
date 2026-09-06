"use client";

import { useCallback, useId, useMemo } from "react";
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
  const uid = useId().replace(/:/g, "");
  const paper = `${uid}-paper`;
  const wobble = `${uid}-wobble`;
  const grain = `${uid}-grain`;

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
      <svg
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <defs>
          <filter id={grain} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.1"
              numOctaves="3"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.28
                      0 0 0 0 0.26
                      0 0 0 0 0.22
                      0 0 0 0.16 0"
              in="noise"
            />
          </filter>
          <filter id={wobble} x="-3%" y="-3%" width="106%" height="106%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.045"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <pattern
            id={paper}
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <rect width="64" height="64" fill="#f1ebdf" />
            <rect width="64" height="64" filter={`url(#${grain})`} />
          </pattern>
        </defs>
      </svg>

      <div
        className="chess-board relative aspect-square w-full"
        role="grid"
        aria-label="Chess board"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M1.6 2.1 C 2.4 1.2, 8 1.4, 20 1.1 C 45 0.6, 55 1.5, 78 1.2 C 90 1.1, 97.2 1.8, 98.4 2.8 C 99.2 4, 98.8 12, 98.9 28 C 99.1 48, 98.6 58, 98.8 78 C 98.9 90, 98.2 97, 97.2 98.2 C 95.8 99.2, 88 98.7, 72 98.9 C 50 99.2, 40 98.5, 22 98.8 C 10 99, 2.4 98.4, 1.5 97.1 C 0.7 95.6, 1.2 88, 1.1 72 C 0.9 50, 1.4 40, 1.2 22 C 1.1 10, 0.9 3.2, 1.6 2.1 Z"
            fill={`url(#${paper})`}
            stroke="#2c2a26"
            strokeWidth="0.7"
            vectorEffect="non-scaling-stroke"
            filter={`url(#${wobble})`}
          />
        </svg>

        <div className="absolute inset-[2.4%] grid grid-cols-8 grid-rows-8 overflow-hidden rounded-[1px]">
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
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2c2a26]/55",
                  sq.isLight ? "square-light" : "square-dark",
                  isSelected ? "square-selected" : "",
                  isLegalTarget ? "square-legal" : "",
                  isCheck ? "square-check" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={`Square ${sq.square}`}
                onClick={() => handleTap(sq.square)}
              >
                {sq.showRank && (
                  <span
                    className={[
                      "coord pointer-events-none absolute left-1 top-1 z-[1] text-[10px] font-medium leading-none",
                      sq.isLight ? "text-[#5a554c]/80" : "text-[#1f1d1a]/72",
                    ].join(" ")}
                  >
                    {sq.rankLabel}
                  </span>
                )}
                {sq.showFile && (
                  <span
                    className={[
                      "coord pointer-events-none absolute bottom-1 right-1 z-[1] text-[10px] font-medium leading-none",
                      sq.isLight ? "text-[#5a554c]/80" : "text-[#1f1d1a]/72",
                    ].join(" ")}
                  >
                    {sq.fileLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {pieces.map((piece) => {
          const { file, rank } = displayPosition(piece.square, orientation);
          const isSelected = selectedSquare === piece.square;

          return (
            <button
              key={`${piece.color}-${piece.type}-${piece.square}`}
              type="button"
              className={[
                "piece pointer-events-auto absolute left-[2.4%] top-[2.4%] z-10 flex h-[calc(95.2%/8)] w-[calc(95.2%/8)] items-center justify-center border-0 bg-transparent p-0",
                isSelected ? "z-20 piece-lifted" : "",
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
              <Piece
                type={piece.type}
                color={piece.color}
                className="h-[98%] w-[98%] drop-shadow-[0_1.5px_1.5px_rgba(55,42,24,0.32)]"
              />
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
