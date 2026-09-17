/**
 * Shared wobbly pencil stroke frame — irregular path, not CSS border-radius chrome.
 */

type PencilFrameProps = {
  className?: string;
  /** Softer dashed look for disabled / offline states */
  dashed?: boolean;
  strokeWidth?: number;
  /**
   * Uniform gap between the host box and the stroke, in px. The path itself
   * hugs the viewBox, so the inset can't skew with the element's aspect ratio
   * the way a percentage inset does on a wide, short card.
   */
  inset?: number;
};

/** Hand-wobbled rounded rect hugging a 100×100 viewBox (stretch via preserveAspectRatio=none). */
const WOBBLE_PATH =
  "M 1.8 5.6 C 1.3 2.8 2.8 1.2 5.9 0.9 L 93.4 0.5 C 96.9 0.3 99.1 2.4 98.8 5.9 L 98.4 94.2 C 98.2 97.8 96.1 99.6 92.4 99.7 L 6.4 99.9 C 2.5 100 0.6 97.7 0.9 94.1 Z";

export function PencilFrame({
  className,
  dashed = false,
  strokeWidth = 1.6,
  inset = 4,
}: PencilFrameProps) {
  return (
    <svg
      className={className}
      style={{ padding: inset }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={WOBBLE_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        strokeDasharray={dashed ? "3.2 2.4" : undefined}
        pathLength={100}
      />
    </svg>
  );
}
