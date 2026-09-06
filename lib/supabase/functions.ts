import { createClient } from "@/lib/supabase/client";
import type {
  AcceptInviteResponse,
  Claim,
  ClaimResultResponse,
  CreateGameResponse,
  SubmitMoveResponse,
  TimeControl,
} from "@/types/game";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    // Prefer the function JSON body when present (e.g. { ok: false, error: "..." })
    if (data && typeof data === "object" && "error" in data) {
      const payload = data as { error?: unknown };
      if (typeof payload.error === "string") {
        throw new Error(payload.error);
      }
    }
    throw new Error(errorMessage(error));
  }

  return data as T;
}

export async function createGame(
  timeControl: TimeControl,
): Promise<CreateGameResponse> {
  return invokeFunction<CreateGameResponse>("create-game", { timeControl });
}

export async function createRematch(
  rematchOf: string,
): Promise<CreateGameResponse> {
  return invokeFunction<CreateGameResponse>("create-game", { rematchOf });
}

export async function acceptInvite(code: string): Promise<AcceptInviteResponse> {
  return invokeFunction<AcceptInviteResponse>("accept-invite", { code });
}

export async function submitMove(
  gameId: string,
  uci: string,
  expectedPly: number,
): Promise<SubmitMoveResponse> {
  return invokeFunction<SubmitMoveResponse>("submit-move", {
    gameId,
    uci,
    expectedPly,
  });
}

export async function claimResult(
  gameId: string,
  claim: Claim,
): Promise<ClaimResultResponse> {
  return invokeFunction<ClaimResultResponse>("claim-result", {
    gameId,
    claim,
  });
}
