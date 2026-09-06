import { Chess, type ChessJsSquare } from "./runtime.ts";
import type {
  BoardPiece,
  Color,
  GameResult,
  MoveOutcome,
  Promotion,
  Square,
  TerminalState,
} from "./types.ts";
import { STARTING_FEN } from "./types.ts";

export type ChessEngine = {
  fen: string;
  turn: Color;
  history: string[];
  inCheck: boolean;
  terminal: TerminalState;
  board: BoardPiece[];
  legalMoves(from: Square): Square[];
  makeMove(from: Square, to: Square, promotion?: Promotion): MoveOutcome;
  loadFen(fen: string): boolean;
  reset(): void;
};

export type UciMoveResult =
  | {
      ok: true;
      fen: string;
      san: string;
      uci: string;
      terminal: TerminalState;
    }
  | { ok: false };

function toSquare(square: ChessJsSquare): Square {
  return square as Square;
}

function parseBoard(chess: Chess): BoardPiece[] {
  const pieces: BoardPiece[] = [];
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = `${String.fromCharCode("a".charCodeAt(0) + file)}${rank + 1}` as Square;
      const piece = chess.get(square as ChessJsSquare);
      if (piece) {
        pieces.push({
          square,
          type: piece.type as BoardPiece["type"],
          color: piece.color as Color,
        });
      }
    }
  }
  return pieces;
}

export function getTerminalState(chess: Chess): TerminalState {
  if (chess.isCheckmate()) {
    const winner: GameResult = chess.turn() === "w" ? "black" : "white";
    return { over: true, result: winner, reason: "checkmate" };
  }

  if (chess.isStalemate()) {
    return { over: true, result: "draw", reason: "stalemate" };
  }

  if (chess.isThreefoldRepetition()) {
    return { over: true, result: "draw", reason: "threefold" };
  }

  if (chess.isInsufficientMaterial()) {
    return { over: true, result: "draw", reason: "insufficient_material" };
  }

  if (
    chess.isDraw() &&
    !chess.isStalemate() &&
    !chess.isThreefoldRepetition() &&
    !chess.isInsufficientMaterial()
  ) {
    return { over: true, result: "draw", reason: "fifty_move" };
  }

  return { over: false };
}

function createEngineState(chess: Chess): ChessEngine {
  const state: ChessEngine = {
    get fen() {
      return chess.fen();
    },
    get turn() {
      return chess.turn() as Color;
    },
    get history() {
      return chess.history();
    },
    get inCheck() {
      return chess.inCheck();
    },
    get terminal() {
      return getTerminalState(chess);
    },
    get board() {
      return parseBoard(chess);
    },
    legalMoves(from: Square) {
      return chess
        .moves({ square: from as ChessJsSquare, verbose: true })
        .map((move: { to: ChessJsSquare }) => toSquare(move.to));
    },
    makeMove(from: Square, to: Square, promotion?: Promotion): MoveOutcome {
      try {
        const move = chess.move({
          from: from as ChessJsSquare,
          to: to as ChessJsSquare,
          promotion,
        });
        return move ? { ok: true } : { ok: false };
      } catch {
        return { ok: false };
      }
    },
    loadFen(fen: string) {
      try {
        chess.load(fen);
        return true;
      } catch {
        return false;
      }
    },
    reset() {
      chess.reset();
    },
  };

  return state;
}

export function createEngine(fen: string = STARTING_FEN): ChessEngine {
  const chess = new Chess(fen);
  return createEngineState(chess);
}

export function getTurnFromFen(fen: string): Color | null {
  try {
    return new Chess(fen).turn() as Color;
  } catch {
    return null;
  }
}

export function tryMoveUci(fen: string, uci: string): UciMoveResult {
  try {
    const chess = new Chess(fen);
    const move = chess.move(uci);
    if (!move) {
      return { ok: false };
    }
    return {
      ok: true,
      fen: chess.fen(),
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ""),
      terminal: getTerminalState(chess),
    };
  } catch {
    return { ok: false };
  }
}

export function isPromotionMove(
  engine: ChessEngine,
  from: Square,
  to: Square,
): boolean {
  const piece = engine.board.find((p) => p.square === from);
  if (!piece || piece.type !== "p") {
    return false;
  }

  const toRank = parseInt(to[1], 10);
  const isPromotionRank =
    (piece.color === "w" && toRank === 8) || (piece.color === "b" && toRank === 1);
  if (!isPromotionRank) {
    return false;
  }

  return engine.legalMoves(from).includes(to);
}
