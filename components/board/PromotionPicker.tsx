import type { Promotion } from "@/lib/chess/types";
import { PencilFrame } from "@/components/ui/PencilFrame";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,29,21,0.45)] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
    >
      <div className="paper-card relative w-full max-w-xs">
        <PencilFrame
          className="paper-stroke pointer-events-none absolute inset-0 h-full w-full text-[var(--ink)]"
          strokeWidth={1.7}
        />
        <div className="relative z-[1]">
          <p className="meta-caps text-center">Promote to</p>

          <div className="mt-4 flex justify-center gap-2">
            {OPTIONS.map((piece) => (
              <button
                key={piece}
                type="button"
                className={`promo-option ${color === "w" ? "piece-w" : "piece-b"}`}
                aria-label={pieceLabel(piece, color)}
                onClick={() => onSelect(piece)}
              >
                <PencilFrame
                  className="pointer-events-none absolute inset-0 h-full w-full text-[var(--ink)]"
                  strokeWidth={1.4}
                  inset={2}
                />
                <Piece type={piece} color={color} size={44} />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="paper-link mt-4 w-full text-center text-sm font-semibold"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
