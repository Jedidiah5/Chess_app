"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createGame } from "@/lib/supabase/functions";

export default function PlayOnlinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreateGame() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await createGame();
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      router.push(`/play/${result.gameId}`);
    } catch {
      setErrorMessage("Could not create game. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Play online</h1>
        <p className="mt-2 text-sm text-stone-600">
          Create an untimed game and share the invite link with your opponent.
        </p>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleCreateGame}
          disabled={loading}
          className="mt-6 w-full rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create game"}
        </button>

        <Link
          href="/play"
          className="mt-4 block text-center text-sm text-stone-600 underline-offset-2 hover:underline"
        >
          Back to play menu
        </Link>
      </div>
    </main>
  );
}
