import Link from "next/link";
import { PlateNotice } from "@/components/ui/PlatePage";
import { eyebrow, navLink } from "@/components/ui/plateStyles";

export default function NotFound() {
  return (
    <PlateNotice>
      <p className={eyebrow}>404</p>
      <h1 className="mt-2 font-serif-title text-4xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 font-mono-plate text-[10px] uppercase tracking-[0.16em] text-[#1F1915]/60">
        That page or game doesn&apos;t exist, or isn&apos;t yours to view.
      </p>
      <div className="mt-5 flex justify-center gap-5 border-t border-[#1F1915]/20 pt-4">
        <Link href="/profile" className={navLink}>
          Profile
        </Link>
        <Link href="/leaderboard" className={navLink}>
          Ladder
        </Link>
      </div>
    </PlateNotice>
  );
}
