import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  const configured = hasSupabaseEnv();

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-stone-900">Sign in</h1>
      <p className="mt-2 text-sm text-stone-600">
        We&apos;ll email you a magic link — no password needed.
      </p>

      {!configured ? (
        <div className="mt-6 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Supabase is not configured yet.</p>
          <p>
            Add your project URL and anon key to{" "}
            <code className="rounded bg-amber-100 px-1">.env.local</code>, then
            restart the dev server:
          </p>
          <pre className="overflow-x-auto rounded bg-amber-100 p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <p>
            Find both values in your{" "}
            <a
              href="https://supabase.com/dashboard/project/_/settings/api"
              className="underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Supabase API settings
            </a>
            .
          </p>
          <Link
            href="/play/local"
            className="inline-block text-stone-700 underline underline-offset-2"
          >
            Play pass-and-play without an account
          </Link>
        </div>
      ) : (
        <Suspense fallback={<p className="mt-6 text-sm text-stone-500">Loading…</p>}>
          <LoginForm />
        </Suspense>
      )}
    </div>
  );
}
