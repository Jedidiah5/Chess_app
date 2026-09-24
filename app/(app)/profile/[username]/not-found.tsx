import Link from "next/link";

export default function NotFound() {
  return (
    <main className="landing-paper flex min-h-dvh items-center justify-center px-5 text-[#1F1915]">
      <div className="landing-plate-card w-full max-w-sm text-center">
        <h1 className="font-serif-title text-4xl font-semibold tracking-tight">
          Profile not found
        </h1>
        <p className="mt-2 font-mono-plate text-[10px] uppercase tracking-[0.16em] text-[#1F1915]/60">
          No player with that username exists.
        </p>
        <div className="mt-5 flex justify-center gap-5 border-t border-[#1F1915]/20 pt-4 font-mono-plate text-[9px] font-bold uppercase tracking-[0.18em] text-[#1F1915]/65">
          <Link href="/" className="hover:text-[#1F1915]">
            Home
          </Link>
          <Link href="/leaderboard" className="hover:text-[#1F1915]">
            Ladder
          </Link>
        </div>
      </div>
    </main>
  );
}
