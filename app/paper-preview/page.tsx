import { InkKnight } from "@/components/board/InkKnight";
import "@/app/paper-tokens.css";

const SWATCHES = [
  { name: "page", varName: "--paper-page", hex: "#e6dcc8" },
  { name: "light square", varName: "--paper-light", hex: "#f2e8d5" },
  { name: "dark square", varName: "--paper-dark", hex: "#a89880" },
  { name: "ink", varName: "--ink", hex: "#2c2419" },
  { name: "white fill", varName: "--piece-white-fill", hex: "#f7f0e2" },
  { name: "black fill", varName: "--piece-black-fill", hex: "#2c2419" },
] as const;

export default function PaperPreviewPage() {
  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{ background: "var(--paper-page)", color: "var(--ink)" }}
    >
      <div className="mx-auto max-w-lg">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--ink-muted)", fontWeight: 500 }}
        >
          Phase 1.5 · preview only
        </p>
        <h1
          className="mt-2 text-3xl"
          style={{ fontFamily: "var(--font-print)", fontWeight: 600 }}
        >
          Paper palette + knight
        </h1>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: "var(--ink-muted)", fontWeight: 400 }}
        >
          Approve the tone and line weight before the rest of the set and motion
          land. Newsreader at 400 / 600 — two weights max.
        </p>

        <section className="mt-10">
          <h2
            className="text-sm uppercase tracking-[0.14em]"
            style={{ fontWeight: 600 }}
          >
            Palette
          </h2>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {SWATCHES.map((s) => (
              <li key={s.name} className="text-center">
                <div
                  className="mx-auto aspect-square w-full max-w-[72px] rounded-sm"
                  style={{
                    background: `var(${s.varName})`,
                    boxShadow: `0 4px 10px var(--shadow-warm-soft), inset 0 0 0 1px var(--ink-faint)`,
                  }}
                  title={s.hex}
                />
                <p
                  className="mt-2 text-[11px] leading-tight"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {s.name}
                </p>
                <p className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                  {s.hex}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2
            className="text-sm uppercase tracking-[0.14em]"
            style={{ fontWeight: 600 }}
          >
            Knight — board size
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            ~desktop square (~64px)
          </p>
          <div className="mt-4 flex gap-3">
            <Square tone="light">
              <InkKnight color="w" size={64} />
            </Square>
            <Square tone="dark">
              <InkKnight color="w" size={64} />
            </Square>
            <Square tone="light">
              <InkKnight color="b" size={64} />
            </Square>
            <Square tone="dark">
              <InkKnight color="b" size={64} />
            </Square>
          </div>
        </section>

        <section className="mt-12">
          <h2
            className="text-sm uppercase tracking-[0.14em]"
            style={{ fontWeight: 600 }}
          >
            Knight — phone square
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            ~40px — if the eye and mane vanish here, the stroke is too fine
          </p>
          <div className="mt-4 flex gap-2">
            <Square tone="light" phone>
              <InkKnight color="w" size={40} />
            </Square>
            <Square tone="dark" phone>
              <InkKnight color="w" size={40} />
            </Square>
            <Square tone="light" phone>
              <InkKnight color="b" size={40} />
            </Square>
            <Square tone="dark" phone>
              <InkKnight color="b" size={40} />
            </Square>
          </div>
        </section>

        <section className="mt-12 rounded-sm p-4" style={{ background: "var(--paper-page-deep)" }}>
          <h2 className="text-sm" style={{ fontWeight: 600 }}>
            Warm shadow (the whole trick later)
          </h2>
          <div className="mt-4 flex justify-center gap-10 py-6">
            <div
              className="flex h-20 w-20 items-center justify-center"
              style={{
                background: "var(--paper-light)",
                boxShadow: "0 2px 3px var(--shadow-warm-tight)",
              }}
            >
              <InkKnight color="w" size={56} />
            </div>
            <div
              className="flex h-20 w-20 items-center justify-center"
              style={{
                background: "var(--paper-light)",
                boxShadow: "0 10px 18px var(--shadow-warm)",
                transform: "scale(1.08)",
              }}
            >
              <InkKnight color="w" size={56} />
            </div>
          </div>
          <p className="text-center text-xs" style={{ color: "var(--ink-muted)" }}>
            Resting (tight) → lifted (spread + soft). Brown tint, not grey.
          </p>
        </section>

        <p className="mt-10 text-sm" style={{ color: "var(--ink-muted)" }}>
          Confirm palette + knight line weight, then I’ll do the other five
          pieces, deckled board, and the motion set.
        </p>
      </div>
    </main>
  );
}

function Square({
  tone,
  phone,
  children,
}: {
  tone: "light" | "dark";
  phone?: boolean;
  children: React.ReactNode;
}) {
  const size = phone ? 44 : 72;
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: tone === "light" ? "var(--paper-light)" : "var(--paper-dark)",
        boxShadow: "inset 0 0 0 1px var(--ink-faint)",
      }}
    >
      {children}
    </div>
  );
}
