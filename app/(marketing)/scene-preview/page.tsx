"use client";

/**
 * Isolated scene preview — approve the pawns before landing copy/layout.
 * Marketing route only; Three stays out of the app bundle.
 */

import dynamic from "next/dynamic";
import "@/app/paper-tokens.css";

const PaperPawnsScene = dynamic(
  () =>
    import("@/components/marketing/PaperPawnsScene").then(
      (m) => m.PaperPawnsScene,
    ),
  { ssr: false },
);

export default function ScenePreviewPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden" style={{ background: "#e6dcc8" }}>
      <p
        className="pointer-events-none absolute left-4 top-4 z-10 text-xs uppercase tracking-[0.18em]"
        style={{ color: "#5c5346", fontFamily: "var(--font-print)", fontWeight: 500 }}
      >
        Scene preview · approve pawns before copy
      </p>
      <PaperPawnsScene className="h-full w-full" />
    </main>
  );
}
