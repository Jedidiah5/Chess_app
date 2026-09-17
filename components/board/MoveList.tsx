type MoveListProps = {
  history: string[];
};

type MovePair = {
  number: number;
  white?: string;
  black?: string;
};

function pairMoves(history: string[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
    });
  }
  return pairs;
}

/** Printed score sheet: hairline rules, tabular figures, no boxes. */
export function MoveList({ history }: MoveListProps) {
  const pairs = pairMoves(history);

  if (pairs.length === 0) {
    return <p className="meta-caps">No moves yet</p>;
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr>
            <th className="meta-caps w-8 pb-2 text-left font-normal">#</th>
            <th className="meta-caps pb-2 text-left font-normal">White</th>
            <th className="meta-caps pb-2 text-left font-normal">Black</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair) => (
            <tr
              key={pair.number}
              className="border-t border-[var(--ink-faint)]"
            >
              <td
                className="py-1.5 pr-3 text-xs"
                style={{ color: "var(--ink-muted)" }}
              >
                {pair.number}
              </td>
              <td className="py-1.5 pr-3" style={{ color: "var(--ink)" }}>
                {pair.white ?? ""}
              </td>
              <td className="py-1.5" style={{ color: "var(--ink)" }}>
                {pair.black ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
