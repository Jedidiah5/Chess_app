"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReducedMotion(motion.matches);
      setAllowScene(!motion.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);

  return (
    <main className="landing-paper relative min-h-dvh overflow-hidden text-[#1F1915] antialiased selection:bg-[#1F1915] selection:text-[#EAE3D2]">
      {/* Full-bleed visual behind the card */}
      <div className="absolute inset-0 z-[5]" aria-hidden="true">
        {/* Poster as LCP fallback - always rendered, fades out when 3D is ready */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: sceneReady ? 0 : 1 }}
        >
          <Poster />
        </div>

        {/* 3D scene layered on top when allowed and supported */}
        {allowScene && (
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: sceneReady ? 1 : 0 }}
          >
            <PaperRoyalsScene
              className="h-full w-full cursor-grab active:cursor-grabbing"
              freeze={reducedMotion}
              onReady={() => setSceneReady(true)}
            />
          </div>
        )}

        <div
          className="landing-archival-grain pointer-events-none absolute inset-0 opacity-25"
          aria-hidden
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[6] bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(234,227,210,0.08)_35%,rgba(234,227,210,0.55)_100%)]"
        aria-hidden
      />

      <div className="relative z-20 flex min-h-dvh flex-col items-center justify-center px-5 py-10">
        <SettingsGearLink className="absolute right-5 top-5 sm:right-8 sm:top-8" />

        <h1 className="font-serif-title text-6xl font-semibold tracking-tight text-[#1F1915] sm:text-7xl md:text-8xl">
          Chess
        </h1>

        <p className="mt-4 max-w-xs text-center font-serif text-lg leading-relaxed text-[#1F1915]/75 sm:text-xl">
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
        <section className="mt-12 max-w-md text-center">
          <h2 className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/55">
            What you get
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#1F1915]/70">
            <li>
              <strong className="font-semibold text-[#1F1915]">Online play</strong>{" "}
              — challenge friends with invite links, rated games with Elo
            </li>
            <li>
              <strong className="font-semibold text-[#1F1915]">Stockfish AI</strong>{" "}
              — four difficulty levels, runs entirely in your browser
            </li>
            <li>
              <strong className="font-semibold text-[#1F1915]">Works offline</strong>{" "}
              — install as an app, play without a connection
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
