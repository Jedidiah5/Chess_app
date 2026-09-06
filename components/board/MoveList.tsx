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

export function MoveList({ history }: MoveListProps) {
  const pairs = pairMoves(history);

  if (pairs.length === 0) {
    return (
      <p className="text-sm text-stone-500">No moves yet.</p>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500">
            <th className="pb-2 pr-3 font-medium">#</th>
            <th className="pb-2 pr-3 font-medium">White</th>
            <th className="pb-2 font-medium">Black</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair) => (
            <tr key={pair.number} className="border-b border-stone-100">
              <td className="py-1.5 pr-3 text-stone-400">{pair.number}.</td>
              <td className="py-1.5 pr-3 font-mono">{pair.white ?? ""}</td>
              <td className="py-1.5 font-mono">{pair.black ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
