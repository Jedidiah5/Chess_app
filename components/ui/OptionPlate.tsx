import { PencilFrame } from "@/components/ui/PencilFrame";

type OptionPlateProps = {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  note?: string;
};

/** Radio dressed as a letterpress plate; the input stays for a11y and keyboard. */
export function OptionPlate({
  name,
  checked,
  onSelect,
  label,
  note,
}: OptionPlateProps) {
  return (
    <label className={`paper-option ${checked ? "paper-option--on" : ""}`}>
      <PencilFrame
        className={`pointer-events-none absolute inset-0 h-full w-full ${
          checked ? "" : "text-[var(--ink-muted)]"
        }`}
        strokeWidth={1.4}
        inset={2}
      />
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="relative z-[1] text-sm font-semibold">{label}</span>
      {note ? (
        <span className="paper-option-note relative z-[1] text-xs">{note}</span>
      ) : null}
    </label>
  );
}
