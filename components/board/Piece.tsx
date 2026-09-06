"use client";

import { useId } from "react";
import type { Color, PieceType } from "@/lib/chess/types";

type PieceProps = {
  type: PieceType;
  color: Color;
  size?: number;
  className?: string;
};

/**
 * Staunton-inspired silhouettes with a graphite/ink stroke.
 */
export function Piece({ type, color, size = 100, className }: PieceProps) {
  const uid = useId().replace(/:/g, "");
  const filterId = `${uid}-pencil`;
  const isWhite = color === "w";
  const fill = isWhite ? "#f7f3ea" : "#2a2a28";
  const stroke = isWhite ? "#2c2a26" : "#0f0e0c";
  const accent = isWhite ? "#2c2a26" : "#ebe6dc";

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={["piece-svg overflow-visible", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            result="noise"
            seed={type.charCodeAt(0) + (isWhite ? 1 : 7)}
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="0.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g transform="translate(22.5 22.5) scale(1.18) translate(-22.5 -22.5)">
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        >
          {renderShape(type, accent, isWhite, stroke)}
        </g>
      </g>
    </svg>
  );
}

function renderShape(
  type: PieceType,
  accent: string,
  isWhite: boolean,
  stroke: string,
) {
  switch (type) {
    case "p":
      return (
        <>
          <path d="M22.5 11c-2.4 0-4.3 2-4.3 4.4 0 1.4.7 2.6 1.7 3.4-2.8 1-4.8 3.7-4.8 6.9v1.2h14.8V25.7c0-3.2-2-5.9-4.8-6.9 1-.8 1.7-2 1.7-3.4 0-2.4-1.9-4.4-4.3-4.4z" />
          <path d="M14.5 28.8h16l1.2 3.4H13.3z" />
          <path d="M12 33.4h21l.8 2.8c0 .8-.6 1.4-1.4 1.4H12.6c-.8 0-1.4-.6-1.4-1.4z" />
        </>
      );
    case "r":
      return (
        <>
          <path d="M11.5 14.2h4.2v3.4h3.6V14.2h5.4v3.4h3.6V14.2h4.2v6.8H11.5z" />
          <path d="M13.2 21.5h18.6v11.2H13.2z" />
          <path d="M11.8 33.4h21.4v2.8c0 .8-.6 1.4-1.4 1.4H13.2c-.8 0-1.4-.6-1.4-1.4z" />
          <path
            d="M16.2 24.2h12.6M16.2 27.8h12.6M16.2 31.2h12.6"
            fill="none"
            stroke={accent}
            strokeWidth={1}
          />
        </>
      );
    case "n":
      return (
        <>
          <path d="M13.5 36.2c0 .8.6 1.4 1.4 1.4h15.2c.8 0 1.4-.6 1.4-1.4v-1.6H13.5z" />
          <path d="M14.2 32.8h16.6l.6-3.2c.4-2.2-.2-4.2-1.6-5.8-1.2-1.4-2-3.2-1.6-5.2.3-1.4 1.4-2.6 2.8-3.1l1.2-.4-1.4-1.8c-2.2 1-4.2 1.4-6.4.6-2.6-.9-4.4-2.8-6.2-5.1l-1.3 1.2c1.6 2.2 3.2 4 5.4 5.1-2.4 1.1-4.2 3.4-4.8 6.1-.6 2.6.1 5.2 1.6 7.2z" />
          <circle cx="27.2" cy="18.4" r="1.15" fill={accent} stroke="none" />
          {!isWhite && (
            <path
              d="M16.8 28.4c1.8-2.4 4.2-3.6 7-3.2"
              fill="none"
              stroke={accent}
              strokeWidth={0.9}
              opacity={0.55}
            />
          )}
        </>
      );
    case "b":
      return (
        <>
          <circle cx="22.5" cy="9.6" r="2.1" />
          <path d="M22.5 12.4c-4.8 5.2-7.8 10.2-7.8 15.2 0 3.2 1.6 5.4 4.2 6.6h7.2c2.6-1.2 4.2-3.4 4.2-6.6 0-5-3-10-7.8-15.2z" />
          <path
            d="M18.8 22.2h7.4M22.5 16.4v11.2"
            fill="none"
            stroke={accent}
            strokeWidth={1.1}
          />
          <path d="M14.2 35.2h16.6l1 1.6c.3.5 0 1.2-.6 1.2H13.8c-.6 0-.9-.7-.6-1.2z" />
          <ellipse cx="22.5" cy="34.2" rx="9.2" ry="2.1" />
        </>
      );
    case "q":
      return (
        <>
          <circle cx="12.2" cy="13.2" r="2" />
          <circle cx="22.5" cy="9.4" r="2.15" />
          <circle cx="32.8" cy="13.2" r="2" />
          <path d="M12.4 15.4 15.8 30.8h13.4l3.4-15.4-5.6 6.2-4.5-8.2-4.5 8.2z" />
          <path d="M15.2 31.6h14.6l.8 2.2H14.4z" />
          <path d="M12.8 34.6h19.4v2.2c0 .7-.6 1.2-1.2 1.2H14c-.7 0-1.2-.5-1.2-1.2z" />
          <path
            d="M17.4 24.8h10.2M18.6 28.2h7.8"
            fill="none"
            stroke={accent}
            strokeWidth={0.95}
            opacity={0.7}
          />
        </>
      );
    case "k":
      return (
        <>
          <path
            d="M22.5 7.2v5.6M19.8 10h5.4"
            fill="none"
            stroke={isWhite ? stroke : accent}
            strokeWidth={1.6}
          />
          <path d="M14.2 15.6c2.4 2.2 5.2 3.4 8.3 3.4s5.9-1.2 8.3-3.4c.8 2.6.4 5.4-1.2 7.6-1.4 1.9-2.2 4-2.2 6.2v2.2H17.6v-2.2c0-2.2-.8-4.3-2.2-6.2-1.6-2.2-2-5-1.2-7.6z" />
          <path d="M16.4 31.8h12.2l1 2.2H15.4z" />
          <path d="M13.2 34.8h18.6v2.2c0 .7-.5 1.2-1.2 1.2H14.4c-.7 0-1.2-.5-1.2-1.2z" />
          <path
            d="M18.2 21.4h8.6"
            fill="none"
            stroke={accent}
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
