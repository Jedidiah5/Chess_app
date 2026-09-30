"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlateNotice } from "@/components/ui/PlatePage";
import { alertBox, eyebrow, navLink } from "@/components/ui/plateStyles";
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
    <PlateNotice>
      {errorMessage ? (
        <>
          <p className={eyebrow}>Invite {code.toUpperCase()}</p>
          <h1 className="mt-2 font-serif-title text-4xl font-semibold tracking-tight">
            Couldn&apos;t join
          </h1>
          <p className={`mt-4 text-left first-letter:uppercase ${alertBox}`} role="alert">
            {errorMessage}
          </p>
          <div className="mt-5 border-t border-[#1F1915]/20 pt-4">
            <Link href="/profile" className={navLink}>
              Back to profile
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className={eyebrow}>Invite {code.toUpperCase()}</p>
          <h1 className="mt-2 font-serif-title text-4xl font-semibold tracking-tight">
            Joining game…
          </h1>
          <p className="mt-2 font-mono-plate text-[9px] uppercase tracking-[0.18em] text-[#1F1915]/60">
            Setting up the board
          </p>
        </>
      )}
    </PlateNotice>
  );
}
