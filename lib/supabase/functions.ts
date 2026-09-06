import { createClient } from "@/lib/supabase/client";
import type {
  AcceptInviteResponse,
  CreateGameResponse,
  SubmitMoveResponse,
} from "@/types/game";

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    throw new Error(error.message);
  }

  return data as T;
}

export async function createGame(): Promise<CreateGameResponse> {
  return invokeFunction<CreateGameResponse>("create-game", {
    timeControl: "untimed",
  });
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
