"use client";

import { useId } from "react";
import type { Color } from "@/lib/chess/types";

type InkKnightProps = {
  color: Color;
  size?: number;
  className?: string;
};

/**
 * Phase 1.5 preview — ink / woodcut knight only.
 * Line weight tuned to stay clear at ~40px (phone square).
 */
export function InkKnight({ color, size = 100, className }: InkKnightProps) {
  const uid = useId().replace(/:/g, "");
  const grainId = `${uid}-grain`;
  const isWhite = color === "w";

  const fill = isWhite ? "var(--piece-white-fill)" : "var(--piece-black-fill)";
  const stroke = isWhite
    ? "var(--piece-white-stroke)"
    : "var(--piece-black-stroke)";
  const detail = isWhite ? "var(--ink)" : "var(--piece-black-stroke)";

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Subtle paper tooth on the fill — low opacity, not a wobble blur */}
        <filter id={grainId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.4"
            numOctaves="2"
            seed={isWhite ? 3 : 9}
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.17
                    0 0 0 0 0.14
                    0 0 0 0 0.10
                    0 0 0 0.08 0"
            result="grain"
          />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
        </filter>
      </defs>

      <g
        fill={fill}
        stroke={stroke}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${grainId})`}
      >
        {/* Pedestal */}
        <path d="M12.5 37.2h20c.7 0 1.2.5 1.2 1.1v1.1c0 .5-.5.9-1.1.9H12.4c-.6 0-1.1-.4-1.1-.9v-1.1c0-.6.5-1.1 1.2-1.1z" />
        {/* Body + neck + head — one continuous woodcut silhouette */}
        <path d="M14.8 35.6h15.4l.5-2.4c.5-2.6-.2-4.6-1.8-6.2-1.1-1.1-1.9-2.5-1.7-4.2.2-1.5 1.2-2.7 2.6-3.3l1.4-.5-.8-1.6c-1.1.5-2.2.8-3.4.7-1.8-.1-3.3-1-4.7-2.4-1.5-1.5-2.8-2.4-4.4-2.9l-.6 1.5c1.2.4 2.2 1.1 3.3 2.2.9 1 1.8 1.6 2.9 1.9-2.5.9-4.4 3-5 5.8-.7 3 .2 5.8 2.1 7.9l.2.3z" />
        {/* Mane notch — ink cut, reads at small size */}
        <path
          d="M22.2 16.4c1.4-.2 2.8.1 3.9.9"
          fill="none"
          stroke={detail}
          strokeWidth={1.35}
          opacity={isWhite ? 0.85 : 0.7}
        />
        {/* Eye */}
        <circle
          cx="28.4"
          cy="18.6"
          r="1.25"
          fill={detail}
          stroke="none"
        />
        {/* Jaw mark */}
        <path
          d="M24.8 22.2c1.6.4 3 .2 4.2-.6"
          fill="none"
          stroke={detail}
          strokeWidth={1.2}
          opacity={0.55}
        />
      </g>
    </svg>
  );
}
