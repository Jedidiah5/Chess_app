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
import type { MotionPiece } from "./useMoveAnimator";
import { TRAVEL_MS } from "./useMoveAnimator";

type BoardProps = {
  pieces: BoardPiece[];
  orientation: BoardOrientation;
  selectedSquare: Square | null;
  legalTargets: Square[];
  inCheckSquare: Square | null;
  onSquareTap: (square: Square) => void;
  /** When set, renders animated motion pieces instead of raw `pieces`. */
  motionPieces?: MotionPiece[] | null;
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

const DECKLE_PATH =
  "M1.55 2.25 C 2.15 1.05, 7.8 1.55, 19.6 0.95 C 44.2 0.35, 54.8 1.85, 77.6 1.05 C 89.5 0.85, 96.9 2.15, 98.55 3.05 C 99.45 4.25, 98.55 11.6, 98.95 27.4 C 99.35 47.8, 98.25 57.6, 98.85 77.5 C 99.15 89.8, 97.85 96.6, 96.95 98.35 C 95.55 99.45, 87.6 98.35, 71.8 99.05 C 49.6 99.55, 39.8 98.15, 21.6 98.95 C 9.8 99.25, 2.15 98.05, 1.25 96.85 C 0.45 95.25, 1.45 87.6, 0.95 71.4 C 0.55 49.2, 1.75 39.4, 0.95 21.5 C 0.65 9.6, 0.85 3.45, 1.55 2.25 Z";

export function Board({
  pieces,
  orientation,
  selectedSquare,
  legalTargets,
  inCheckSquare,
  onSquareTap,
  motionPieces = null,
}: BoardProps) {
  const uid = useId().replace(/:/g, "");
  const hatchId = `${uid}-hatch`;

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

  const rendered: MotionPiece[] = useMemo(() => {
    if (motionPieces) {
      return motionPieces;
    }
    return pieces.map((p) => {
      const { file, rank } = displayPosition(p.square, orientation);
      const lifted = selectedSquare === p.square;
      return {
        key: `${p.color}${p.type}-${p.square}`,
        type: p.type,
        color: p.color,
        file,
        rank,
        square: p.square,
        opacity: 1,
        scale: lifted ? 1.08 : 1,
        rotateDeg: 0,
        arcY: 0,
        shadow: lifted ? 1 : 0,
        zIndex: lifted ? 30 : 10,
        interactive: true,
      };
    });
  }, [motionPieces, pieces, orientation, selectedSquare]);

  return (
    <div className="w-full max-w-[min(90vw,560px)]">
      <svg
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={hatchId}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(42)"
          >
            <rect width="10" height="10" fill="#cfc6b6" />
            <path
              d="M0 1.15h10M0 3.05h10M0 4.95h10M0 6.85h10M0 8.75h10"
              stroke="#3a3834"
              strokeWidth="0.85"
              strokeOpacity="0.55"
              strokeLinecap="round"
            />
            <path
              d="M0 2.05h10M0 3.95h10M0 5.85h10M0 7.75h10"
              stroke="#2a2824"
              strokeWidth="0.45"
              strokeOpacity="0.35"
              strokeLinecap="round"
            />
            <path
              d="M0 0.35h10M0 9.45h10"
              stroke="#4a4640"
              strokeWidth="0.3"
              strokeOpacity="0.25"
            />
            <path
              d="M0 1.55h10M0 6.15h10"
              stroke="#3a3834"
              strokeWidth="0.35"
              strokeOpacity="0.12"
              transform="rotate(-80 5 5)"
            />
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
            d={DECKLE_PATH}
            fill="#f1ebdf"
            stroke="#2c2a26"
            strokeWidth="0.7"
            vectorEffect="non-scaling-stroke"
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
                {!sq.isLight && (
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  >
                    <rect
                      width="100%"
                      height="100%"
                      fill={`url(#${hatchId})`}
                    />
                  </svg>
                )}

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

        {rendered.map((piece) => (
          <button
            key={piece.key}
            type="button"
            disabled={!piece.interactive}
            className="piece piece-motion pointer-events-auto absolute left-[2.4%] top-[2.4%] flex h-[calc(95.2%/8)] w-[calc(95.2%/8)] items-center justify-center border-0 bg-transparent p-0"
            style={{
              transform: `translate3d(${piece.file * 100}%, ${piece.rank * 100}%, 0)`,
              zIndex: piece.zIndex,
              transition: `transform ${TRAVEL_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1)`,
              pointerEvents: piece.interactive ? "auto" : "none",
            }}
            aria-label={`${piece.color === "w" ? "White" : "Black"} ${piece.type} on ${piece.square}`}
            onClick={(event) => {
              event.stopPropagation();
              if (piece.interactive) {
                handleTap(piece.square);
              }
            }}
          >
            {/* Knight arc wrapper — only translateY */}
            <span
              className="piece-arc relative flex h-full w-full items-center justify-center"
              style={{
                transform: `translate3d(0, ${piece.arcY}%, 0)`,
                transition: `transform ${TRAVEL_MS}ms cubic-bezier(0.2, 0.85, 0.3, 1)`,
              }}
            >
              {/* Lift shadow — opacity + scale only; none at rest */}
              <span
                className="piece-lift-shadow"
                aria-hidden="true"
                style={{
                  opacity: piece.shadow,
                  transform: `translate(-50%, 18%) scale(${0.65 + piece.shadow * 0.55})`,
                }}
              />
              <span
                className="relative flex h-[98%] w-[98%] items-center justify-center"
                style={{
                  opacity: piece.opacity,
                  transform: `scale(${piece.scale}) rotate(${piece.rotateDeg}deg)`,
                  transition:
                    "transform 160ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 160ms linear",
                }}
              >
                <Piece
                  type={piece.type}
                  color={piece.color}
                  className="h-full w-full"
                />
              </span>
            </span>
          </button>
        ))}
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
