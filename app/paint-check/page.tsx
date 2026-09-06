"use client";

import { useEffect, useState } from "react";
import { Board } from "@/components/board/Board";
import { createEngine } from "@/lib/chess/engine";
import type { Square } from "@/lib/chess/types";

/**
 * Paint-flashing confirmation page.
 * Open DevTools → More tools → Rendering → Paint flashing,
 * then watch while the probe piece translates. Squares should not flash green.
 */
export default function PaintCheckPage() {
  const [engine] = useState(() => createEngine());
  const [selected, setSelected] = useState<Square | null>("e2");
  const [probeOn, setProbeOn] = useState(true);

  useEffect(() => {
    // Expose a hook for the CDP verification script
    (window as unknown as { __paintCheckReady?: boolean }).__paintCheckReady =
      true;
  }, []);

  return (
    <main className="min-h-screen bg-[#ebe4d6] px-4 py-8">
      <div className="mx-auto max-w-xl space-y-4">
        <header>
          <h1 className="font-serif text-2xl text-[#2c2a26]">Paint check</h1>
          <p className="mt-1 text-sm text-[#5a554c]">
            DevTools → Rendering → Paint flashing. With the probe on, green
            flashes on the moving piece mean paint (bad). Composite-only motion
            should leave the board quiet.
          </p>
        </header>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-[#2c2a26]/30 bg-[#f4efe4] px-3 py-1.5 text-sm"
            onClick={() => setProbeOn((v) => !v)}
          >
            Probe {probeOn ? "on" : "off"}
          </button>
        </div>

        <div
          data-paint-root
          className={probeOn ? "paint-check-board" : undefined}
        >
          <Board
            pieces={engine.board}
            orientation="white"
            selectedSquare={selected}
            legalTargets={[]}
            inCheckSquare={null}
            onSquareTap={(sq) => setSelected(sq)}
          />
        </div>
      </div>
    </main>
  );
}
