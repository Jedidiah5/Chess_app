import type { Promotion, Square } from "@/lib/chess/types";

export function parseUci(uci: string): {
  from: Square;
  to: Square;
  promotion?: Promotion;
} | null {
  if (uci.length < 4) return null;
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promo = uci[4];
  const promotion =
    promo === "q" || promo === "r" || promo === "b" || promo === "n"
      ? promo
      : undefined;
  return { from, to, promotion };
}
