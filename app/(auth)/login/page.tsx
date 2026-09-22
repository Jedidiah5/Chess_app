import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  const configured = hasSupabaseEnv();

  return (
    <div className="landing-plate-card">
      <h1 className="font-serif-title text-center text-4xl font-semibold tracking-tight">
        Log in
      </h1>
      <p className="mt-2 text-center font-mono-plate text-[9px] uppercase tracking-[0.18em] text-[#1F1915]/65">
        Magic link · no password
      </p>

      {!configured ? (
        <div className="mt-6 space-y-3 border border-[#1F1915]/25 bg-[#F4EEDB]/80 p-4 font-mono-plate text-[11px] leading-relaxed text-[#1F1915]">
          <p className="font-bold uppercase tracking-wider">Supabase not configured</p>
          <p>
            Add your project URL and anon key to{" "}
            <code className="bg-[#EAE3D2] px-1">.env.local</code>, then restart
            the dev server.
          </p>
          <Link
            href="/play/local"
            className="inline-block font-bold uppercase tracking-[0.15em] underline-offset-2 hover:underline"
          >
            Pass and play without an account
          </Link>
        </div>
      ) : (
        <Suspense
          fallback={
            <p className="mt-6 text-center font-mono-plate text-[10px] uppercase tracking-widest text-[#1F1915]/50">
              Loading…
            </p>
          }
        >
          <LoginForm />
        </Suspense>
      )}

      <div className="mt-5 border-t border-[#1F1915]/20 pt-4 text-center font-mono-plate text-[9px] uppercase tracking-[0.18em] text-[#1F1915]/65">
        <Link href="/" className="hover:text-[#1F1915]">
          Home
        </Link>
      </div>
    </div>
  );
}
