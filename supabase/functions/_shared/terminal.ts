import type { TerminalState } from "./chess/types.ts";

type DbGameResult = "white" | "black" | "draw";
type DbEndReason =
  | "checkmate"
  | "stalemate"
  | "threefold"
  | "fifty_move"
  | "insufficient_material";

export function mapTerminalToDb(
  terminal: TerminalState,
): { result: DbGameResult; reason: DbEndReason } | null {
  if (!terminal.over) {
    return null;
  }

  return {
    result: terminal.result,
    reason: terminal.reason as DbEndReason,
  };
}
