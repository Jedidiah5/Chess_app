"use client";

import dynamic from "next/dynamic";

const PaperRoyalsScene = dynamic(
  () =>
    import("@/components/marketing/PaperRoyalsScene").then(
      (m) => m.PaperRoyalsScene,
    ),
  { ssr: false },
);

export default function ScenePreviewPage() {
  return (
    <main className="landing-paper relative min-h-dvh">
      <div className="absolute inset-0">
        <PaperRoyalsScene className="h-full w-full" />
      </div>
      <p className="absolute bottom-6 left-0 right-0 text-center font-mono-plate text-[10px] uppercase tracking-[0.25em] text-[#1F1915]/70">
        Scene preview · King &amp; Queen
      </p>
    </main>
  );
}
