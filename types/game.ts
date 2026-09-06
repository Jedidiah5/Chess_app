export type GameStatus = "waiting" | "active" | "finished" | "abandoned";
export type DbGameResult = "white" | "black" | "draw";
export type DbEndReason =
  | "checkmate"
  | "resignation"
  | "timeout"
  | "disconnect"
  | "stalemate"
  | "threefold"
  | "fifty_move"
  | "insufficient_material"
  | "agreement";

export type GameRow = {
  id: string;
  white_id: string;
  black_id: string | null;
  current_fen: string;
  ply: number;
  status: GameStatus;
  result: DbGameResult | null;
  reason: DbEndReason | null;
  rated: boolean;
  initial_ms: number;
  increment_ms: number;
  white_ms: number;
  black_ms: number;
  last_move_at: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export type MoveRow = {
  game_id: string;
  ply: number;
  san: string;
  uci: string;
  fen_after: string;
  ms_left: number; 
  created_at: string;
};

export type InviteRow = {
  code: string;
  game_id: string;
  created_by: string;
  expires_at: string;
};

export type FunctionError = {
  ok: false;
  error: string;
};

export type CreateGameResponse =
  | { ok: true; gameId: string; inviteCode: string }
  | FunctionError;

export type AcceptInviteResponse =
  | { ok: true; gameId: string }
  | FunctionError;

export type SubmitMoveResponse =
  | {
      ok: true;
      fen: string;
      ply: number;
      status: GameStatus;
      result?: DbGameResult;
      reason?: DbEndReason;
    }
  | FunctionError;
