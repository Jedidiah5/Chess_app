"use client";

import type { ReactNode } from "react";
import { OfflineGate } from "@/components/offline/OfflineUI";

export function OnlineOnly({
  children,
  feature,
}: {
  children: ReactNode;
  feature: string;
}) {
  return <OfflineGate feature={feature}>{children}</OfflineGate>;
}
