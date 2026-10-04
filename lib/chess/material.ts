import type { BoardPiece, Color, PieceType } from "@/lib/chess/types";

type CapturablePiece = Exclude<PieceType, "k">;

const CAPTURE_ORDER: CapturablePiece[] = ["p", "n", "b", "r", "q"];

const STARTING_COUNT: Record<CapturablePiece, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
};

export const PIECE_VALUE: Record<CapturablePiece, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

export type SideCaptures = {
  /** Opponent pieces this side has taken, cheapest first. */
  pieces: CapturablePiece[];
  /** Material lead over the opponent; 0 when level or behind. */
  lead: number;
};

function countPieces(board: BoardPiece[], color: Color) {
  const counts: Record<CapturablePiece, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  for (const piece of board) {
    if (piece.color === color && piece.type !== "k") counts[piece.type] += 1;
  }
  return counts;
}

function missingPieces(board: BoardPiece[], color: Color): CapturablePiece[] {
  const counts = countPieces(board, color);
  // A promoted pawn shows up as an extra piece, not as a pawn taken by the opponent.
  const promoted = (["n", "b", "r", "q"] as const).reduce(
    (sum, type) => sum + Math.max(0, counts[type] - STARTING_COUNT[type]),
    0,
  );

  const missing: CapturablePiece[] = [];
  for (const type of CAPTURE_ORDER) {
    const onBoard = type === "p" ? counts.p + promoted : counts[type];
    const taken = Math.max(0, STARTING_COUNT[type] - onBoard);
    for (let i = 0; i < taken; i += 1) missing.push(type);
  }
  return missing;
}

function material(board: BoardPiece[], color: Color): number {
  const counts = countPieces(board, color);
  return CAPTURE_ORDER.reduce((sum, type) => sum + counts[type] * PIECE_VALUE[type], 0);
}

export function capturesFor(board: BoardPiece[], side: Color): SideCaptures {
  const opponent: Color = side === "w" ? "b" : "w";
  return {
    pieces: missingPieces(board, opponent),
    lead: Math.max(0, material(board, side) - material(board, opponent)),
  };
}
