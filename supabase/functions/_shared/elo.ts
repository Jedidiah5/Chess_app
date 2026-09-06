export function kFactor(gamesPlayed: number, rating: number): number {
  if (gamesPlayed < 30) return 40;
  if (rating > 2400) return 16;
  return 32;
}

export function eloDelta(
  mine: number,
  theirs: number,
  score: 0 | 0.5 | 1,
  k: number,
): number {
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400));
  return Math.round(k * (score - expected));
}

export type EloPairInput = {
  whiteRating: number;
  blackRating: number;
  whiteGamesPlayed: number;
  blackGamesPlayed: number;
  result: "white" | "black" | "draw";
};

export type EloPairResult = {
  whiteDelta: number;
  blackDelta: number;
};

/**
 * One shared K (average of both players') so the winner gains exactly what the
 * loser drops — deltas always sum to zero.
 */
export function computeEloPair(input: EloPairInput): EloPairResult {
  const whiteScore: 0 | 0.5 | 1 =
    input.result === "white" ? 1 : input.result === "black" ? 0 : 0.5;

  const kWhite = kFactor(input.whiteGamesPlayed, input.whiteRating);
  const kBlack = kFactor(input.blackGamesPlayed, input.blackRating);
  const k = Math.round((kWhite + kBlack) / 2);

  const whiteDelta = eloDelta(
    input.whiteRating,
    input.blackRating,
    whiteScore,
    k,
  );

  return { whiteDelta, blackDelta: -whiteDelta };
}
