"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isUsernameAvailable, profileUpdateErrorMessage } from "@/lib/supabase/profile";
import { usernameValidationError } from "@/lib/usernames";

export default function UsernamePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatError = usernameValidationError(username);

  useEffect(() => {
    if (formatError || username.length === 0) {
      setAvailable(null);
      return;
    }

    setChecking(true);
    const timer = window.setTimeout(async () => {
      try {
        const isAvailable = await isUsernameAvailable(supabase, username);
        setAvailable(isAvailable);
      } catch {
        setAvailable(null);
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

  let availabilityMessage: string | null = null;
  if (username.length > 0 && !formatError) {
    if (checking) {
      availabilityMessage = "Checking availability…";
    } else if (available === true) {
      availabilityMessage = "Username is available.";
    } else if (available === false) {
      availabilityMessage = "That username is already taken.";
    }
  }

  const canSubmit =
    !submitting &&
    !formatError &&
    available === true &&
    username.length > 0;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-stone-900">Choose a username</h1>
      <p className="mt-2 text-sm text-stone-600">
        3–20 characters. Letters, numbers, underscore, and hyphen.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-stone-700">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.trimStart())}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-stone-900 outline-none ring-stone-400 focus:ring-2"
            placeholder="your_name"
          />
          {formatError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {formatError}
            </p>
          )}
          {!formatError && availabilityMessage && (
            <p
              className={`mt-2 text-sm ${
                available ? "text-emerald-700" : "text-stone-500"
              }`}
            >
              {availabilityMessage}
            </p>
          )}
        </div>

        {errorMessage && (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
