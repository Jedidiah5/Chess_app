"use client";

import dynamic from "next/dynamic";

const InkPawnScene = dynamic(
  () => import("@/components/profile/InkPawnScene").then((m) => m.InkPawnScene),
  { ssr: false, loading: () => null },
);

export function ProfilePawn({ className }: { className?: string }) {
  return <InkPawnScene className={className} tone="ebony" />;
}
