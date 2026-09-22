"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const supabase = createClient();
    const next = searchParams.get("next");
    const callback = new URL("/auth/callback", window.location.origin);
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      callback.searchParams.set("next", next);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callback.toString(),
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <>
      {status === "sent" ? (
        <div className="mt-6 border border-[#1F1915]/30 bg-[#E7DFD2] p-4 font-mono-plate text-[11px] leading-relaxed text-[#1F1915]">
          Check your email for the sign-in link. It expires after a short time.
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/70"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full border border-[#1F1915]/40 bg-[#F4EEDB] px-3 py-2.5 font-serif-title text-base text-[#1F1915] outline-none focus:border-[#1F1915]"
              placeholder="you@example.com"
            />
          </div>

          {errorMessage && (
            <p
              className="font-mono-plate text-[11px] text-red-800"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full border border-[#1F1915] bg-[#1F1915] px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#E7DFD2] transition hover:bg-[#2D241E] disabled:opacity-60 active:scale-[0.99]"
          >
            {status === "loading" ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}

      <p className="mt-5 text-center font-mono-plate text-[9px] uppercase tracking-[0.15em] text-[#1F1915]/60">
        <Link href="/play/local" className="hover:text-[#1F1915]">
          Pass and play without an account
        </Link>
      </p>
    </>
  );
}
