"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

export function SettingsGearIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10c.1.7.7 1.2 1.5 1.2H19a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3Z" />
    </svg>
  );
}

const gearClass =
  "inline-flex h-10 w-10 items-center justify-center border border-[#1F1915]/40 bg-[#F4EEDB]/90 text-[#1F1915] transition hover:border-[#1F1915] hover:bg-[#E7DFD2]";

type SettingsGearButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export function SettingsGearButton({
  className = "",
  ...rest
}: SettingsGearButtonProps) {
  return (
    <button
      type="button"
      aria-label="Settings"
      className={`${gearClass} ${className}`}
      {...rest}
    >
      <SettingsGearIcon />
    </button>
  );
}

export function SettingsGearLink({
  href = "/settings",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} aria-label="Settings" className={`${gearClass} ${className}`}>
      <SettingsGearIcon />
    </Link>
  );
}
