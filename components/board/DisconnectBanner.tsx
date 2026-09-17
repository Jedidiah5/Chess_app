"use client";

type DisconnectBannerProps = {
  secondsLeft: number;
};

export function DisconnectBanner({ secondsLeft }: DisconnectBannerProps) {
  return (
    <div className="paper-notice w-full max-w-md" role="status">
      <span className="meta-caps">Opponent reconnecting</span>
      <span className="tabular-nums text-sm font-semibold">{secondsLeft}s</span>
    </div>
  );
}
