import { PlateNotice } from "@/components/ui/PlatePage";
import { eyebrow, primaryBtn, secondaryBtn } from "@/components/ui/plateStyles";

export default function OfflinePage() {
  return (
    <PlateNotice>
      <p className={eyebrow}>No connection</p>
      <h1 className="mt-2 font-serif-title text-4xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="mt-3 font-mono-plate text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[#1F1915]/65">
        Online play, the ladder &amp; your archive need a connection. These still
        work on this device:
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <a href="/play/computer" className={primaryBtn}>
          Play with computer
        </a>
        <a href="/play/local" className={secondaryBtn}>
          Pass and play
        </a>
      </div>
    </PlateNotice>
  );
}
