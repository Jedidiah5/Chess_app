"use client";

import type { Color, PieceType } from "@/lib/chess/types";

type PieceProps = {
  type: PieceType;
  color: Color;
  size?: number;
  className?: string;
};

/**
 * Engraved Staunton silhouettes with wobble baked into path geometry.
 * No SVG filters — transform/opacity motion stays composite-only.
 */
export function Piece({ type, color, size = 100, className }: PieceProps) {
  const isWhite = color === "w";

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={[
        "piece-svg overflow-visible",
        isWhite ? "piece-w" : "piece-b",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <g transform="translate(22.5 22.5) scale(1.18) translate(-22.5 -22.5)">
        <g
          fill="currentColor"
          stroke="var(--piece-stroke)"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {renderShape(type, isWhite)}
        </g>
      </g>
    </svg>
  );
}

/** Paths intentionally imperfect — engraving wobble baked in (was feDisplacementMap). */
function renderShape(type: PieceType, isWhite: boolean) {
  switch (type) {
    case "p":
      return (
        <>
          <path d="M22.4 10.85c-2.35.05-4.25 1.95-4.2 4.35.05 1.38.72 2.55 1.68 3.35-2.75.95-4.72 3.55-4.85 6.85v1.15h14.9l-.08-1.2c-.05-3.15-1.95-5.85-4.72-6.8.98-.82 1.68-1.95 1.65-3.35-.05-2.4-1.85-4.4-4.38-4.35z" />
          <path d="M14.35 28.65h16.15l1.15 3.45H13.2z" />
          <path d="M11.9 33.25h21.2l.75 2.85c.05.75-.55 1.35-1.35 1.4H12.55c-.82-.02-1.42-.62-1.38-1.42z" />
        </>
      );
    case "r":
      return (
        <>
          <path d="M11.35 14.05h4.35v3.45h3.45V13.95h5.55v3.55h3.5V14.1h4.15v6.7H11.4z" />
          <path d="M13.05 21.35h18.85v11.35H13.1z" />
          <path d="M11.65 33.25h21.65v2.85c.02.78-.55 1.42-1.35 1.45H13.05c-.8 0-1.42-.6-1.4-1.4z" />
          <path
            d="M16.05 24.05h12.85M16.35 27.65h12.3M16.15 31.05h12.7"
            fill="none"
            stroke="var(--piece-accent)"
            strokeWidth={1}
          />
        </>
      );
    case "n":
      return (
        <>
          <path d="M13.35 36.05c.02.82.58 1.45 1.42 1.48h15.1c.82-.02 1.42-.62 1.4-1.42v-1.55H13.4z" />
          <path d="M14.05 32.65h16.85l.55-3.15c.35-2.15-.25-4.15-1.55-5.75-1.25-1.45-2.05-3.15-1.55-5.25.28-1.42 1.35-2.65 2.75-3.15l1.25-.35-1.45-1.85c-2.15 1.05-4.25 1.35-6.35.55-2.55-.95-4.45-2.75-6.25-5.05l-1.25 1.25c1.55 2.15 3.15 3.95 5.35 5.05-2.35 1.15-4.25 3.35-4.85 6.15-.55 2.55.15 5.15 1.65 7.15z" />
          <circle
            cx="27.35"
            cy="18.25"
            r="1.12"
            fill="var(--piece-accent)"
            stroke="none"
          />
          {!isWhite && (
            <path
              d="M16.65 28.25c1.85-2.35 4.25-3.55 7.15-3.05"
              fill="none"
              stroke="var(--piece-accent)"
              strokeWidth={0.9}
              opacity={0.55}
            />
          )}
        </>
      );
    case "b":
      return (
        <>
          <circle cx="22.55" cy="9.45" r="2.05" />
          <path d="M22.55 12.25c-4.75 5.15-7.85 10.05-7.65 15.15.05 3.15 1.55 5.35 4.15 6.55h7.35c2.55-1.25 4.15-3.35 4.05-6.55-.15-5.05-3.05-10.15-7.9-15.15z" />
          <path
            d="M18.65 22.05h7.65M22.35 16.25v11.35"
            fill="none"
            stroke="var(--piece-accent)"
            strokeWidth={1.1}
          />
          <path d="M14.05 35.05h16.85l.95 1.65c.28.48-.05 1.15-.58 1.18H13.65c-.55.02-.92-.65-.6-1.15z" />
          <ellipse cx="22.45" cy="34.05" rx="9.35" ry="2.05" />
        </>
      );
    case "q":
      return (
        <>
          <circle cx="12.05" cy="13.05" r="2.05" />
          <circle cx="22.55" cy="9.25" r="2.2" />
          <circle cx="32.95" cy="13.15" r="1.95" />
          <path d="M12.25 15.25 15.65 30.65h13.65l3.25-15.25-5.55 6.05-4.65-8.05-4.35 8.15z" />
          <path d="M15.05 31.45h14.85l.75 2.25H14.25z" />
          <path d="M12.65 34.45h19.65v2.25c0 .68-.55 1.15-1.15 1.18H13.85c-.68 0-1.18-.48-1.15-1.15z" />
          <path
            d="M17.25 24.65h10.45M18.45 28.05h8.05"
            fill="none"
            stroke="var(--piece-accent)"
            strokeWidth={0.95}
            opacity={0.7}
          />
        </>
      );
    case "k":
      return (
        <>
          <path
            d="M22.55 7.05v5.75M19.65 9.85h5.65"
            fill="none"
            stroke="var(--piece-accent)"
            strokeWidth={1.6}
          />
          <path d="M14.05 15.45c2.45 2.15 5.25 3.35 8.45 3.25 3.15-.05 5.85-1.25 8.15-3.45.75 2.65.35 5.45-1.25 7.65-1.35 1.85-2.15 3.95-2.05 6.15v2.15H17.45v-2.25c.05-2.15-.75-4.25-2.15-6.15-1.55-2.15-1.95-4.95-1.25-7.35z" />
          <path d="M16.25 31.65h12.45l.95 2.25H15.25z" />
          <path d="M13.05 34.65h18.85v2.25c0 .68-.48 1.15-1.15 1.18H14.25c-.68 0-1.18-.48-1.15-1.15z" />
          <path
            d="M18.05 21.25h8.85"
            fill="none"
            stroke="var(--piece-accent)"
            strokeWidth={1}
            opacity={0.65}
          />
        </>
      );
  }
}

export function pieceLabel(type: PieceType, color: Color): string {
  const names: Record<PieceType, string> = {
    p: "Pawn",
    n: "Knight",
    b: "Bishop",
    r: "Rook",
    q: "Queen",
    k: "King",
  };
  const side = color === "w" ? "White" : "Black";
  return `${side} ${names[type]}`;
}
