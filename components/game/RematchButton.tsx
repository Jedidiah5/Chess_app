"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createRematch } from "@/lib/supabase/functions";
import { PaperButton } from "@/components/ui/PaperButton";

type RematchButtonProps = {
  gameId: string;
  className?: string;
};

export function RematchButton({ gameId, className }: RematchButtonProps) {
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
    <div className="flex flex-col items-center">
      <PaperButton
        variant="primary"
        disabled={loading}
        onClick={handleRematch}
        className={className}
      >
        {loading ? "Creating…" : "Rematch"}
      </PaperButton>
      {errorMessage && <p className="paper-alert mt-2">{errorMessage}</p>}
    </div>
  );
}
