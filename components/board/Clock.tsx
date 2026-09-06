"use client";

import { useEffect, useRef, useState } from "react";

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
      <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm">
        <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
        <p className="font-mono text-lg text-stone-800">∞</p>
      </div>
    );
  }

  const low = displayMs <= 30_000;

  return (
    <div
      className={[
        "rounded-md border px-3 py-2 text-sm",
        isActive ? "border-stone-800 bg-stone-800 text-white" : "border-stone-200 bg-white",
        low && isActive ? "border-red-700 bg-red-700" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p
        className={[
          "text-xs uppercase tracking-wide",
          isActive ? "text-stone-300" : "text-stone-500",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="font-mono text-lg tabular-nums">{formatMs(displayMs)}</p>
    </div>
  );
}
