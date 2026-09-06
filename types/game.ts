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

export type TimeControl = "blitz" | "rapid" | "untimed";

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
  white_seen_at: string | null;
  black_seen_at: string | null;
  draw_offer_by: string | null;
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
  | { ok: true; gameId: string; inviteCode: string | null }
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
      white_ms?: number;
      black_ms?: number;
      result?: DbGameResult;
      reason?: DbEndReason;
    }
  | FunctionError;

export type ClaimResultResponse =
  | {
      ok: true;
      result: DbGameResult | null;
      reason: DbEndReason | null;
    }
  | FunctionError;

export type Claim =
  | "resign"
  | "timeout"
  | "disconnect"
  | "draw_offer"
  | "draw_accept"
  | "draw_decline";
