"use client";

import Link from "next/link";
import { useOnlineStatus } from "@/components/offline/OfflineUI";

export default function PlayPage() {
  const online = useOnlineStatus();

  return (
    <main className="min-h-screen bg-[#ebe4d6] px-4 py-12">
      <div className="mx-auto max-w-md space-y-4">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-stone-900">Play chess</h1>
          <p className="mt-2 text-sm text-stone-600">Choose how you want to play.</p>
        </header>

        {online ? (
          <Link
            href="/play/online"
            className="block rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow"
          >
            <h2 className="text-lg font-semibold text-stone-900">Play online</h2>
            <p className="mt-1 text-sm text-stone-600">
              Create a game and invite a friend with a link.
            </p>
          </Link>
        ) : (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white/70 p-6">
            <h2 className="text-lg font-semibold text-stone-900">Play online</h2>
            <p className="mt-1 text-sm text-stone-600">
              You&apos;re offline — online play needs a connection.
            </p>
          </div>
        )}

        <Link
          href="/play/computer"
          className="block rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Vs computer</h2>
          <p className="mt-1 text-sm text-stone-600">
            Stockfish on-device. Works offline. Always unrated.
          </p>
        </Link>

        <Link
          href="/play/local"
          className="block rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Pass &amp; play</h2>
          <p className="mt-1 text-sm text-stone-600">
            Two players on one device. No account needed.
          </p>
        </Link>

        <div className="flex justify-center gap-4 pt-2 text-sm">
          {online ? (
            <>
              <Link
                href="/leaderboard"
                className="text-stone-700 underline-offset-2 hover:underline"
              >
                Leaderboard
              </Link>
              <Link
                href="/games"
                className="text-stone-700 underline-offset-2 hover:underline"
              >
                Archive
              </Link>
            </>
          ) : (
            <span className="text-stone-500">Leaderboard &amp; archive need a connection</span>
          )}
        </div>
      </div>
    </main>
  );
}
