export type Color = "w" | "b";

export type Square =
  | "a1" | "b1" | "c1" | "d1" | "e1" | "f1" | "g1" | "h1"
  | "a2" | "b2" | "c2" | "d2" | "e2" | "f2" | "g2" | "h2"
  | "a3" | "b3" | "c3" | "d3" | "e3" | "f3" | "g3" | "h3"
  | "a4" | "b4" | "c4" | "d4" | "e4" | "f4" | "g4" | "h4"
  | "a5" | "b5" | "c5" | "d5" | "e5" | "f5" | "g5" | "h5"
  | "a6" | "b6" | "c6" | "d6" | "e6" | "f6" | "g6" | "h6"
  | "a7" | "b7" | "c7" | "d7" | "e7" | "f7" | "g7" | "h7"
  | "a8" | "b8" | "c8" | "d8" | "e8" | "f8" | "g8" | "h8";

export type Promotion = "q" | "r" | "b" | "n";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export type BoardPiece = {
  square: Square;
  type: PieceType;
  color: Color;
};

export type EndReason =
  | "checkmate"
  | "stalemate"
  | "threefold"
  | "fifty_move"
  | "insufficient_material";

export type GameResult = "white" | "black" | "draw";

export type TerminalState =
  | { over: false }
  | { over: true; result: GameResult; reason: EndReason };

export type MoveOutcome = { ok: true } | { ok: false };

export type BoardOrientation = "white" | "black";

export const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function squareToCoords(square: Square): { file: number; rank: number } {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  return { file, rank };
}

export function coordsToSquare(file: number, rank: number): Square {
  return `${FILES[file]}${rank + 1}` as Square;
}

export function displayColor(color: Color): "white" | "black" {
  return color === "w" ? "white" : "black";
}

export function endReasonLabel(reason: EndReason): string {
  switch (reason) {
    case "checkmate":
      return "Checkmate";
    case "stalemate":
      return "Stalemate";
    case "threefold":
      return "Threefold repetition";
    case "fifty_move":
      return "Fifty-move rule";
    case "insufficient_material":
      return "Insufficient material";
  }
}

export function squaresToUci(
  from: Square,
  to: Square,
  promotion?: Promotion,
): string {
  return `${from}${to}${promotion ?? ""}`;
}

export function parseUci(
  uci: string,
): { from: Square; to: Square; promotion?: Promotion } | null {
  const match = uci.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
  if (!match) {
    return null;
  }
  return {
    from: match[1] as Square,
    to: match[2] as Square,
    promotion: match[3] as Promotion | undefined,
  };
}
