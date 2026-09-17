"use client";

import { useEffect, useRef, useState } from "react";
import { PencilFrame } from "@/components/ui/PencilFrame";

type ClockProps = {
  label: string;
  storedMs: number;
  lastMoveAt: string | null;
  isActive: boolean;
  clockOffsetMs: number;
  hasClock: boolean;
  onFlag?: () => void;
};

function formatMs(ms: number): string {
  const clamped = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function Clock({
  label,
  storedMs,
  lastMoveAt,
  isActive,
  clockOffsetMs,
  hasClock,
  onFlag,
}: ClockProps) {
  const [displayMs, setDisplayMs] = useState(storedMs);
  const flaggedRef = useRef(false);

  useEffect(() => {
    flaggedRef.current = false;
  }, [storedMs, lastMoveAt, isActive]);

  useEffect(() => {
    if (!hasClock) {
      setDisplayMs(storedMs);
      return;
    }

    function tick() {
      if (!isActive || !lastMoveAt) {
        setDisplayMs(storedMs);
        return;
      }

      const serverNow = Date.now() + clockOffsetMs;
      const remaining = storedMs - (serverNow - Date.parse(lastMoveAt));
      setDisplayMs(remaining);

      if (remaining <= 0 && !flaggedRef.current) {
        flaggedRef.current = true;
        onFlag?.();
      }
    }

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [clockOffsetMs, hasClock, isActive, lastMoveAt, onFlag, storedMs]);

  if (!hasClock) {
    return (
      <div className="clock-plate">
        <PencilFrame
          className="pointer-events-none absolute inset-0 h-full w-full text-[var(--ink)]"
          strokeWidth={1.3}
          inset={2}
        />
        <p className="meta-caps relative z-[1]">{label}</p>
        <p className="clock-figure relative z-[1]">∞</p>
      </div>
    );
  }

  const low = displayMs <= 30_000;

  return (
    <div
      className={[
        "clock-plate",
        isActive ? "clock-plate--active" : "",
        low && isActive ? "clock-plate--low" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PencilFrame
        className={`pointer-events-none absolute inset-0 h-full w-full ${
          isActive ? "" : "text-[var(--ink)]"
        }`}
        strokeWidth={1.3}
        inset={2}
      />
      <p className="meta-caps relative z-[1]">{label}</p>
      <p className="clock-figure relative z-[1]">{formatMs(displayMs)}</p>
    </div>
  );
}
