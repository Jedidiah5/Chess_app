"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvite } from "@/lib/supabase/functions";

type JoinPageProps = {
  code: string;
};

export function JoinPage({ code }: JoinPageProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function join() {
      const result = await acceptInvite(code.toUpperCase());

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setErrorMessage(result.error.replaceAll("_", " "));
        return;
      }

      router.replace(`/play/${result.gameId}`);
    }

    void join();

    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
        {errorMessage ? (
          <>
            <h1 className="text-xl font-semibold text-stone-900">Could not join game</h1>
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            <Link
              href="/play"
              className="mt-6 inline-block text-sm text-stone-700 underline-offset-2 hover:underline"
            >
              Back to play menu
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-stone-900">Joining game…</h1>
            <p className="mt-2 text-sm text-stone-600">Accepting invite {code}</p>
          </>
        )}
      </div>
    </main>
  );
}
