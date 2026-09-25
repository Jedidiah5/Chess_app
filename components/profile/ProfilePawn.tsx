"use client";

/**
 * Static ink pawn illustration for the profile page.
 * Replaced the Three.js scene to reduce bundle size and WebGL context usage.
 */
export function ProfilePawn({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center ${className ?? ""}`}
      style={{ background: "transparent" }}
    >
      <svg
        viewBox="0 0 100 120"
        className="h-full w-auto max-h-full"
        style={{ filter: "drop-shadow(0 8px 16px rgba(31, 25, 21, 0.15))" }}
        aria-hidden="true"
      >
        {/* Pawn body - scaled and styled to match paper aesthetic */}
        <g transform="translate(50 60) scale(2.4) translate(-22.5 -22.5)">
          <g
            fill="#2a2a28"
            stroke="#1f1915"
            strokeWidth={1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Head */}
            <ellipse cx="22.5" cy="11" rx="4.2" ry="4.3" />
            {/* Neck and body */}
            <path d="M22.4 10.85c-2.35.05-4.25 1.95-4.2 4.35.05 1.38.72 2.55 1.68 3.35-2.75.95-4.72 3.55-4.85 6.85v1.15h14.9l-.08-1.2c-.05-3.15-1.95-5.85-4.72-6.8.98-.82 1.68-1.95 1.65-3.35-.05-2.4-1.85-4.4-4.38-4.35z" />
            {/* Base middle */}
            <path d="M14.35 28.65h16.15l1.15 3.45H13.2z" />
            {/* Base bottom */}
            <path d="M11.9 33.25h21.2l.75 2.85c.05.75-.55 1.35-1.35 1.4H12.55c-.82-.02-1.42-.62-1.38-1.42z" />
          </g>
          {/* Subtle highlight for depth */}
          <ellipse
            cx="22.5"
            cy="11"
            rx="2.5"
            ry="2.6"
            fill="none"
            stroke="rgba(244, 238, 219, 0.25)"
            strokeWidth={0.6}
          />
        </g>
        {/* Contact shadow */}
        <ellipse
          cx="50"
          cy="108"
          rx="22"
          ry="4"
          fill="rgba(31, 25, 21, 0.12)"
        />
      </svg>
    </div>
  );
}
