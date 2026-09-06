import type { Promotion } from "@/lib/chess/types";
import { Piece, pieceLabel } from "./Piece";

type PromotionPickerProps = {
  color: "w" | "b";
  onSelect: (piece: Promotion) => void;
  onCancel: () => void;
};

const OPTIONS: Promotion[] = ["q", "r", "b", "n"];

export function PromotionPicker({ color, onSelect, onCancel }: PromotionPickerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
    >
      <div className="rounded-lg bg-white p-4 shadow-xl">
        <p className="mb-3 text-center text-sm font-medium text-stone-700">
          Promote pawn to
        </p>
        <div className="flex gap-2">
          {OPTIONS.map((piece) => (
            <button
              key={piece}
              type="button"
              className="flex h-16 w-16 items-center justify-center rounded-md border border-stone-300 bg-stone-50 hover:bg-stone-100"
              aria-label={pieceLabel(piece, color)}
              onClick={() => onSelect(piece)}
            >
              <Piece type={piece} color={color} size={48} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
