import type { Color, PieceType } from "@/lib/chess/types";

type PieceProps = {
  type: PieceType;
  color: Color;
  size?: number;
  className?: string;
};

const STROKE = 1.5;

export function Piece({ type, color, size = 100, className }: PieceProps) {
  const fill = color === "w" ? "#f5f5f0" : "#1a1a1a";
  const stroke = color === "w" ? "#333" : "#f5f5f0";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {renderShape(type, fill, stroke)}
    </svg>
  );
}

function renderShape(type: PieceType, fill: string, stroke: string) {
  switch (type) {
    case "p":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={STROKE}>
          <circle cx="50" cy="28" r="10" />
          <path d="M38 38 Q50 48 62 38 L58 72 L42 72 Z" />
          <rect x="34" y="72" width="32" height="8" rx="2" />
        </g>
      );
    case "n":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={STROKE}>
          <path d="M30 78 L35 55 Q38 35 55 28 Q70 22 72 38 Q68 32 58 36 Q48 42 46 55 L52 78 Z" />
          <circle cx="62" cy="34" r="3" fill={stroke} stroke="none" />
          <rect x="28" y="78" width="44" height="8" rx="2" />
        </g>
      );
    case "b":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={STROKE}>
          <ellipse cx="50" cy="78" rx="18" ry="6" />
          <path d="M38 78 Q50 20 62 78" />
          <circle cx="50" cy="24" r="8" />
          <line x1="44" y1="40" x2="56" y2="40" />
          <line x1="42" y1="52" x2="58" y2="52" />
          <line x1="40" y1="64" x2="60" y2="64" />
        </g>
      );
    case "r":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={STROKE}>
          <rect x="32" y="72" width="36" height="10" rx="2" />
          <rect x="36" y="38" width="28" height="34" />
          <rect x="30" y="28" width="10" height="10" />
          <rect x="45" y="28" width="10" height="10" />
          <rect x="60" y="28" width="10" height="10" />
        </g>
      );
    case "q":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={STROKE}>
          <circle cx="30" cy="26" r="5" />
          <circle cx="50" cy="20" r="5" />
          <circle cx="70" cy="26" r="5" />
          <path d="M28 32 Q50 48 72 32 L66 72 L34 72 Z" />
          <rect x="30" y="72" width="40" height="10" rx="2" />
        </g>
      );
    case "k":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={STROKE}>
          <line x1="50" y1="14" x2="50" y2="24" />
          <line x1="45" y1="19" x2="55" y2="19" />
          <path d="M38 28 Q50 38 62 28 L58 72 L42 72 Z" />
          <rect x="32" y="72" width="36" height="10" rx="2" />
        </g>
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
