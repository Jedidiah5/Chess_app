"use client";

/**
 * Isolated scene preview — approve the pawns before landing copy/layout.
 * Marketing route only; Three stays out of the app bundle.
 */

import dynamic from "next/dynamic";

const PaperPawnsScene = dynamic(
  () =>
    import("@/components/marketing/PaperPawnsScene").then(
      (m) => m.PaperPawnsScene,
    ),
  { ssr: false },
);

export default function ScenePreviewPage() {
  return (
    <main
      className="relative h-dvh w-full overflow-hidden"
      style={{ background: "var(--paper-page)" }}
    >
      <p
        className="pointer-events-none absolute left-4 top-4 z-10 text-xs uppercase tracking-[0.18em]"
        style={{ color: "var(--ink-muted)", fontWeight: 600 }}
      >
        Scene preview · two pawns
      </p>
      <PaperPawnsScene className="h-full w-full" />
    </main>
  );
}
