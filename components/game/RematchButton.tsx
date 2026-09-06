"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createRematch } from "@/lib/supabase/functions";

type RematchButtonProps = {
  gameId: string;
};

export function RematchButton({ gameId }: RematchButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRematch() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await createRematch(gameId);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      router.push(`/play/${result.gameId}`);
    } catch {
      setErrorMessage("Could not start rematch.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={handleRematch}
        className="rounded-md bg-stone-800 px-3 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Rematch"}
      </button>
      {errorMessage && (
        <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
