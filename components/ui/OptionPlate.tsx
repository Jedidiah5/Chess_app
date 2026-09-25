import { useId } from "react";
import { PencilFrame } from "@/components/ui/PencilFrame";

type OptionPlateProps = {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  note?: string;
};

/**
 * Radio dressed as a letterpress plate with full keyboard and screen reader support.
 * The native radio input handles focus, keyboard navigation, and announcements.
 */
export function OptionPlate({
  name,
  checked,
  onSelect,
  label,
  note,
}: OptionPlateProps) {
  const id = useId();

  return (
    <div className={`paper-option ${checked ? "paper-option--on" : ""}`}>
      <PencilFrame
        className={`pointer-events-none absolute inset-0 h-full w-full ${
          checked ? "" : "text-[var(--ink-muted)]"
        }`}
        strokeWidth={1.4}
        inset={2}
      />
      <input
        type="radio"
        id={id}
        name={name}
        checked={checked}
        onChange={() => onSelect()}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-describedby={note ? `${id}-note` : undefined}
      />
      <label
        htmlFor={id}
        className="pointer-events-none relative z-[1] flex w-full cursor-pointer items-baseline gap-3"
      >
        <span className="text-sm font-semibold">{label}</span>
        {note ? (
          <span id={`${id}-note`} className="paper-option-note text-xs">
            {note}
          </span>
        ) : null}
      </label>
    </div>
  );
}
