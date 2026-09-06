"use client";

type DisconnectBannerProps = {
  secondsLeft: number;
};

export function DisconnectBanner({ secondsLeft }: DisconnectBannerProps) {
  return (
    <div
      className="w-full max-w-md rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
    >
      Opponent reconnecting… {secondsLeft}s
    </div>
  );
}
