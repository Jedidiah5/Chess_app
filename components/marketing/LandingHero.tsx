"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { SettingsGearLink } from "@/components/settings/SettingsGear";

const PaperRoyalsScene = dynamic(
  () =>
    import("@/components/marketing/PaperRoyalsScene").then(
      (m) => m.PaperRoyalsScene,
    ),
  { ssr: false, loading: () => null },
);

function Poster() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/marketing/royals-poster.svg"
      alt=""
      className="absolute inset-0 h-full w-full object-contain opacity-80"
      fetchPriority="high"
      decoding="async"
    />
  );
}

export function LandingHero({
  dashboardHref = null,
}: {
  dashboardHref?: string | null;
}) {
  const [allowScene, setAllowScene] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const widthMq = window.matchMedia("(min-width: 768px)");

    const sync = () => {
      const prefersMotion = !motionMq.matches;
      const isWide = widthMq.matches;
      setReducedMotion(motionMq.matches);
      setIsDesktop(isWide);
      setAllowScene(prefersMotion && isWide);
    };

    sync();
    motionMq.addEventListener("change", sync);
    widthMq.addEventListener("change", sync);
    return () => {
      motionMq.removeEventListener("change", sync);
      widthMq.removeEventListener("change", sync);
    };
  }, []);

  const handleReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const handleContextLost = useCallback(() => {
    setSceneReady(false);
  }, []);

  const handleContextRestored = useCallback(() => {
    setSceneReady(false);
  }, []);

  const showPoster = !allowScene || !sceneReady;

  return (
    <main className="landing-paper relative min-h-dvh overflow-hidden text-[#1F1915] antialiased selection:bg-[#1F1915] selection:text-[#EAE3D2]">
      {/* Full-bleed visual behind the card */}
      <div className="absolute inset-0 z-[5]" aria-hidden="true">
        {/* Poster as LCP fallback - always rendered on mobile, fades out on desktop when 3D ready */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: showPoster ? 1 : 0 }}
        >
          <Poster />
        </div>

        {/* 3D scene only on desktop with no reduced motion preference */}
        {allowScene && (
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: sceneReady ? 1 : 0 }}
          >
            <PaperRoyalsScene
              className="h-full w-full"
              freeze={reducedMotion}
              onReady={handleReady}
              onContextLost={handleContextLost}
              onContextRestored={handleContextRestored}
            />
          </div>
        )}

        <div
          className="landing-archival-grain pointer-events-none absolute inset-0 opacity-25"
          aria-hidden
        />
      </div>

      {/* Vignette - most opaque at center behind text, clear at edges */}
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          background: isDesktop
            ? "radial-gradient(ellipse 60% 50% at 35% 50%, rgba(234,227,210,0.75) 0%, rgba(234,227,210,0.4) 40%, transparent 70%)"
            : "radial-gradient(ellipse at center, transparent 0%, rgba(234,227,210,0.08) 35%, rgba(234,227,210,0.55) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-20 flex min-h-dvh flex-col items-center justify-center px-5 py-10 md:items-start md:pl-[8%]">
        <SettingsGearLink className="absolute right-5 top-5 sm:right-8 sm:top-8" />

        <h1 className="font-serif-title text-6xl font-semibold tracking-tight text-[#1F1915] sm:text-7xl md:text-8xl">
          Chess
        </h1>

        <p className="mt-4 max-w-xs text-center font-serif text-lg leading-relaxed text-[#1F1915]/75 sm:text-xl md:max-w-sm md:text-left">
          Classic strategy, timeless design. Play online, against the computer,
          or pass & play on one device.
        </p>

        <div className="landing-plate-card mt-8 w-full max-w-sm">
          <div className="flex flex-col gap-3">
            <Link
              href={dashboardHref ?? "/login"}
              className="flex w-full items-center justify-center border border-[#1F1915] bg-[#1F1915] px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#E7DFD2] transition hover:bg-[#2D241E] active:scale-[0.99]"
            >
              {dashboardHref ? "Dashboard" : "Log in"}
            </Link>
            <Link
              href="/play/computer"
              className="flex w-full items-center justify-center border border-[#1F1915] bg-[#E7DFD2] px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#1F1915] transition hover:bg-[#1F1915] hover:text-[#E7DFD2] active:scale-[0.99]"
            >
              Play with computer
            </Link>
            <Link
              href="/play/local"
              className="flex w-full items-center justify-center border border-[#1F1915]/50 bg-transparent px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#1F1915] transition hover:border-[#1F1915] hover:bg-[#1F1915]/5 active:scale-[0.99]"
            >
              Pass and play
            </Link>
          </div>
        </div>

        {/* What it does section */}
        <section className="mt-12 max-w-md text-center md:text-left">
          <h2 className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/55">
            What you get
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#1F1915]/70">
            <li>
              <strong className="font-semibold text-[#1F1915]">
                Online play
              </strong>{" "}
              — challenge friends with invite links, rated games with Elo
            </li>
            <li>
              <strong className="font-semibold text-[#1F1915]">
                Stockfish AI
              </strong>{" "}
              — four difficulty levels, runs entirely in your browser
            </li>
            <li>
              <strong className="font-semibold text-[#1F1915]">
                Works offline
              </strong>{" "}
              — install as an app, play without a connection
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
