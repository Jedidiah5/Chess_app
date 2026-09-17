"use client";

import Link from "next/link";
import { useOnlineStatus } from "@/components/offline/OfflineUI";
import { PaperButton } from "@/components/ui/PaperButton";
import { PaperCard } from "@/components/ui/PaperCard";
import { PencilFrame } from "@/components/ui/PencilFrame";

function ModeCard({
  href,
  index,
  title,
  blurb,
  note,
}: {
  href: string;
  index: string;
  title: string;
  blurb: string;
  note: string;
}) {
  return (
    <Link href={href} className="paper-card relative block">
      <PencilFrame
        className="paper-stroke pointer-events-none absolute inset-0 h-full w-full text-[var(--ink)]"
        strokeWidth={1.7}
      />
      <div className="relative z-[1] flex items-start gap-4">
        <span className="meta-caps mt-1.5 tabular-nums">{index}</span>
        <div className="min-w-0 flex-1">
          <h2
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            {title}
          </h2>
          <p
            className="mt-1.5 text-sm leading-relaxed"
            style={{ color: "var(--ink-muted)" }}
          >
            {blurb}
          </p>
          <p className="meta-caps mt-3">{note}</p>
        </div>
      </div>
    </Link>
  );
}

export default function PlayPage() {
  const online = useOnlineStatus();

  return (
    <main className="relative min-h-dvh bg-[var(--paper-page)] px-5 py-10 sm:py-14">
      <div className="halftone-screen pointer-events-none fixed inset-0" aria-hidden />

      <div className="relative mx-auto w-full max-w-lg">
        <header>
          <div className="flex items-center gap-4">
            <span className="print-rule" aria-hidden />
            <span className="meta-caps whitespace-nowrap">Choose a board</span>
            <span className="print-rule" aria-hidden />
          </div>
          <h1
            className="mt-6 text-center text-5xl font-semibold tracking-[-0.035em]"
            style={{ color: "var(--ink)" }}
          >
            Play
          </h1>
          <p
            className="mt-3 text-center text-sm"
            style={{ color: "var(--ink-muted)" }}
          >
            Three ways to move a piece.
          </p>
        </header>

        <div className="mt-9 space-y-4">
          {online ? (
            <ModeCard
              href="/play/online"
              index="01"
              title="Play online"
              blurb="Create a game and invite a friend with a link."
              note="Rated · Live clocks"
            />
          ) : (
            <PaperCard muted>
              <div className="flex items-start gap-4">
                <span className="meta-caps mt-1.5 tabular-nums">01</span>
                <div>
                  <h2
                    className="text-xl font-semibold tracking-tight"
                    style={{ color: "var(--ink)" }}
                  >
                    Play online
                  </h2>
                  <p
                    className="mt-1.5 text-sm leading-relaxed"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    You&apos;re offline — online play needs a connection.
                  </p>
                  <p className="meta-caps mt-3">Unavailable offline</p>
                </div>
              </div>
            </PaperCard>
          )}

          <ModeCard
            href="/play/computer"
            index="02"
            title="Vs computer"
            blurb="Stockfish on-device, four strengths, no connection needed."
            note="Unrated · Works offline"
          />

          <ModeCard
            href="/play/local"
            index="03"
            title="Pass & play"
            blurb="Two players, one device. No account required."
            note="Unrated · Works offline"
          />
        </div>

        <div className="mt-10 flex items-center gap-4">
          <span className="print-rule" aria-hidden />
          <span className="meta-caps whitespace-nowrap">Records</span>
          <span className="print-rule" aria-hidden />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {online ? (
            <>
              <PaperButton href="/leaderboard" variant="ghost" className="min-w-[9.5rem]">
                Leaderboard
              </PaperButton>
              <PaperButton href="/games" variant="ghost" className="min-w-[9.5rem]">
                Archive
              </PaperButton>
            </>
          ) : (
            <p className="meta-caps text-center">
              Leaderboard &amp; archive need a connection
            </p>
          )}
        </div>

        <footer className="mt-10 text-center">
          <Link href="/" className="paper-link text-sm font-semibold">
            Home
          </Link>
        </footer>
      </div>
    </main>
  );
}
