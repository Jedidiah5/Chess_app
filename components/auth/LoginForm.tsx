"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

const MIN_PASSWORD_LENGTH = 6;

function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setErrorMessage(null);
    setNotice(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setNotice(null);

    if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const next = safeNext(searchParams.get("next"));

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setLoading(false);
        setErrorMessage(
          error.code === "invalid_credentials"
            ? "Wrong email or password."
            : error.code === "email_not_confirmed"
              ? "Confirm your email first, then log in."
              : error.message,
        );
        return;
      }
      // Middleware forwards onboarded players from /username to their profile.
      router.replace(next ?? "/username");
      router.refresh();
      return;
    }

    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: callback.toString() },
    });

    if (error) {
      setLoading(false);
      setErrorMessage(
        error.code === "user_already_exists"
          ? "An account with that email already exists. Log in instead."
          : error.message,
      );
      return;
    }

    if (!data.session) {
      setLoading(false);
      setNotice("Account created. Confirm your email, then log in.");
      setMode("signin");
      return;
    }

    router.replace("/username");
    router.refresh();
  }

  const inputClass =
    "mt-2 w-full border border-[#1F1915]/40 bg-[#F4EEDB] px-3 py-2.5 font-serif-title text-base text-[#1F1915] outline-none focus:border-[#1F1915]";
  const labelClass =
    "font-mono-plate text-[9px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/70";

  return (
    <>
      <div
        className="mt-6 grid grid-cols-2 border border-[#1F1915]/40"
        role="tablist"
      >
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => switchMode(value)}
            className={`py-2 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] transition ${
              mode === value
                ? "bg-[#1F1915] text-[#E7DFD2]"
                : "text-[#1F1915]/70 hover:text-[#1F1915]"
            }`}
          >
            {value === "signin" ? "Log in" : "Create account"}
          </button>
        ))}
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder={
              mode === "signup"
                ? `At least ${MIN_PASSWORD_LENGTH} characters`
                : "••••••••"
            }
          />
        </div>

        {notice && (
          <p
            className="border border-[#1F1915]/30 bg-[#E7DFD2] p-3 font-mono-plate text-[11px] leading-relaxed text-[#1F1915]"
            role="status"
          >
            {notice}
          </p>
        )}

        {errorMessage && (
          <p className="font-mono-plate text-[11px] text-red-800" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full border border-[#1F1915] bg-[#1F1915] px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#E7DFD2] transition hover:bg-[#2D241E] disabled:opacity-60 active:scale-[0.99]"
        >
          {loading
            ? mode === "signin"
              ? "Logging in…"
              : "Creating account…"
            : mode === "signin"
              ? "Log in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center font-mono-plate text-[9px] uppercase tracking-[0.15em] text-[#1F1915]/60">
        <Link href="/play/local" className="hover:text-[#1F1915]">
          Pass and play without an account
        </Link>
      </p>
    </>
  );
}
