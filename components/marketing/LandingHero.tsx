"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PaperButton } from "@/components/ui/PaperButton";
import { PencilFrame } from "@/components/ui/PencilFrame";

const PaperPawnsScene = dynamic(
  () =>
    import("@/components/marketing/PaperPawnsScene").then(
      (m) => m.PaperPawnsScene,
    ),
  { ssr: false, loading: () => <Poster priority /> },
);

function Poster({ priority = false }: { priority?: boolean }) {
  return (
    // Static poster is the LCP element; the scene swaps in after hydration.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/marketing/pawns-poster.svg"
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}

function RuleRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="meta-caps whitespace-nowrap">{left}</span>
      <span className="print-rule" aria-hidden />
      {right ? <span className="meta-caps whitespace-nowrap">{right}</span> : null}
    </div>
  );
}

export function LandingHero() {
  const [allowScene, setAllowScene] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");

    const sync = () => {
      setReducedMotion(motion.matches);
      setAllowScene(wide.matches && !motion.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    wide.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      wide.removeEventListener("change", sync);
    };
  }, []);

  return (
    <main className="paper-grain relative min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 py-7 sm:px-10 sm:py-9">
        <header className="landing-copy">
          <RuleRow left="Paper &amp; Ink" right="Vol. I · Est. 2026" />
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[1.05fr_1fr] md:gap-14">
          {/* Copy */}
          <div className="order-2 text-center md:order-1 md:text-left">
            <h1 className="landing-copy wordmark">Chess</h1>

            <p
              className="landing-copy mx-auto mt-5 max-w-sm text-balance text-base leading-relaxed sm:text-lg md:mx-0"
              style={{ color: "var(--ink-muted)" }}
            >
              A classic board, quietly modern. Play online, face the machine, or
              pass the pieces across the table.
            </p>

            <div className="landing-cta mt-9 flex flex-wrap items-center justify-center gap-3.5 md:justify-start">
              <PaperButton href="/play" variant="primary" className="min-w-[10.5rem]">
                Play
              </PaperButton>
              <PaperButton
                href="/play/computer"
                variant="ghost"
                className="min-w-[10.5rem]"
              >
                Vs computer
              </PaperButton>
            </div>

            <Link
              href="/login"
              className="landing-cta paper-link mt-6 inline-block text-sm font-semibold"
            >
              Sign in to play rated
            </Link>
          </div>

          {/* Plate: the rotating pair, framed like a printed illustration */}
          <div className="landing-cta order-1 md:order-2">
            <figure className="relative aspect-[4/5] w-full max-w-md overflow-hidden bg-[var(--paper-card)] shadow-[0_14px_30px_var(--shadow-warm-soft)] md:ml-auto">
              {allowScene ? (
                <PaperPawnsScene className="h-full w-full" freeze={reducedMotion} />
              ) : (
                <Poster priority />
              )}

              <div
                className="halftone-screen pointer-events-none absolute inset-0"
                aria-hidden
              />
              <PencilFrame
                className="pointer-events-none absolute inset-0 h-full w-full text-[var(--ink)]"
                strokeWidth={1.8}
                inset={7}
              />

              <figcaption className="meta-caps absolute bottom-3 left-0 right-0 text-center">
                Plate I · Two pawns
              </figcaption>
            </figure>
          </div>
        </div>

        <footer className="landing-cta flex flex-wrap items-center justify-between gap-4">
          <span className="meta-caps">Unrated offline · Rated online</span>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/play/local" className="paper-link">
              Pass &amp; play
            </Link>
            <Link href="/leaderboard" className="paper-link">
              Leaderboard
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
