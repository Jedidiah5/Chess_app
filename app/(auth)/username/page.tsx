"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/client";
import { isUsernameAvailable, profileUpdateErrorMessage } from "@/lib/supabase/profile";
import { usernameValidationError } from "@/lib/usernames";

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

const labelClass =
  "font-mono-plate text-[9px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/70";

export default function UsernamePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatError = usernameValidationError(username);
  const stillTyping =
    username.length > 0 &&
    username.length < MIN_LENGTH &&
    /^[A-Za-z0-9_-]*$/.test(username);

  useEffect(() => {
    setCheckFailed(false);
    setAvailable(null);
    if (formatError || username.length === 0) {
      return;
    }

    setChecking(true);
    const timer = window.setTimeout(async () => {
      try {
        const isAvailable = await isUsernameAvailable(supabase, username);
        setAvailable(isAvailable);
      } catch {
        setAvailable(null);
        setCheckFailed(true);
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [formatError, supabase, username]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const validationError = usernameValidationError(username);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id)
      .is("username", null)
      .select("username")
      .maybeSingle();

    if (error) {
      setErrorMessage(profileUpdateErrorMessage(error));
      setSubmitting(false);
      return;
    }

    if (!data?.username) {
      setErrorMessage("That username was just taken. Pick another.");
      setAvailable(false);
      setSubmitting(false);
      return;
    }

    router.replace(`/profile/${data.username}`);
    router.refresh();
  }

  let status: { text: string; tone: "muted" | "ok" | "error" };
  if (username.length === 0) {
    status = { text: "Letters, numbers, underscore, hyphen", tone: "muted" };
  } else if (stillTyping) {
    status = { text: `At least ${MIN_LENGTH} characters`, tone: "muted" };
  } else if (formatError) {
    status = { text: formatError, tone: "error" };
  } else if (checkFailed) {
    status = { text: "Couldn't check right now", tone: "muted" };
  } else if (checking || available === null) {
    status = { text: "Checking the register…", tone: "muted" };
  } else if (available) {
    status = { text: "Available", tone: "ok" };
  } else {
    status = { text: "Already taken", tone: "error" };
  }

  const statusClass =
    status.tone === "error"
      ? "text-red-800"
      : status.tone === "ok"
        ? "font-bold text-[#1F1915]"
        : "text-[#1F1915]/55";

  const canSubmit =
    !submitting &&
    !formatError &&
    available === true &&
    username.length > 0;

  return (
    <div className="landing-plate-card">
      <p className="text-center font-mono-plate text-[9px] font-bold uppercase tracking-[0.24em] text-[#1F1915]/55">
        One last step
      </p>
      <h1 className="mt-2 font-serif-title text-center text-4xl font-semibold tracking-tight">
        Choose a name
      </h1>
      <p className="mt-2 text-center font-mono-plate text-[9px] uppercase tracking-[0.18em] text-[#1F1915]/65">
        Shown on your profile &amp; the ladder
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="username" className={labelClass}>
              Username
            </label>
            <span className="font-mono-plate text-[9px] tabular-nums tracking-[0.12em] text-[#1F1915]/50">
              {username.length}/{MAX_LENGTH}
            </span>
          </div>
          <input
            id="username"
            type="text"
            required
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={MAX_LENGTH}
            value={username}
            onChange={(event) => setUsername(event.target.value.trim())}
            aria-invalid={status.tone === "error"}
            aria-describedby="username-status"
            className={`mt-2 w-full border bg-[#F4EEDB] px-3 py-2.5 font-serif-title text-lg text-[#1F1915] outline-none placeholder:text-[#1F1915]/35 focus:border-[#1F1915] ${
              status.tone === "error" ? "border-red-900/50" : "border-[#1F1915]/40"
            }`}
            placeholder="your_name"
          />
          <p
            id="username-status"
            className={`mt-2 font-mono-plate text-[10px] uppercase tracking-[0.14em] ${statusClass}`}
            aria-live="polite"
          >
            {status.tone === "ok" ? "✓ " : ""}
            {status.text}
          </p>
        </div>

        {errorMessage && (
          <p
            className="border border-red-900/30 bg-red-50/60 px-3 py-2.5 font-mono-plate text-[11px] leading-relaxed text-red-900"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full border border-[#1F1915] bg-[#1F1915] px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#E7DFD2] transition hover:bg-[#2D241E] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>

      <div className="mt-5 border-t border-[#1F1915]/20 pt-4 text-center">
        <SignOutButton className="font-mono-plate text-[9px] uppercase tracking-[0.18em] text-[#1F1915]/65 hover:text-[#1F1915] disabled:opacity-50" />
      </div>
    </div>
  );
}
