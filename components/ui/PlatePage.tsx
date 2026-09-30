import Link from "next/link";
import type { ReactNode } from "react";
import { SettingsGearLink } from "@/components/settings/SettingsGear";
import { navLink } from "@/components/ui/plateStyles";

type NavItem = { href: string; label: string };

/** Paper page with the masthead used across signed-in pages. */
export function PlatePage({
  children,
  nav = [],
  width = "max-w-3xl",
}: {
  children: ReactNode;
  nav?: NavItem[];
  width?: string;
}) {
  return (
    <main className="landing-paper relative min-h-dvh overflow-hidden text-[#1F1915] antialiased selection:bg-[#1F1915] selection:text-[#EAE3D2]">
      <div
        className="landing-archival-grain pointer-events-none absolute inset-0 opacity-20"
        aria-hidden
      />

      <div className={`relative z-10 mx-auto w-full ${width} px-5 py-6 sm:px-8 sm:py-8`}>
        <header className="landing-double-rule-bottom flex items-center justify-between gap-4 pb-4">
          <Link
            href="/profile"
            className="font-serif-title text-3xl font-semibold tracking-tight"
          >
            Chess
          </Link>
          <nav className="flex items-center gap-4">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={navLink}>
                {item.label}
              </Link>
            ))}
            <SettingsGearLink />
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}

/** Centered single-card page for short states (joining, offline, not found). */
export function PlateNotice({ children }: { children: ReactNode }) {
  return (
    <main className="landing-paper relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12 text-[#1F1915] antialiased">
      <div
        className="landing-archival-grain pointer-events-none absolute inset-0 opacity-20"
        aria-hidden
      />
      <div className="landing-plate-card relative z-10 w-full max-w-sm text-center">
        {children}
      </div>
    </main>
  );
}
