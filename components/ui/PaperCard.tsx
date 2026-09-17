import type { ReactNode } from "react";
import { PencilFrame } from "@/components/ui/PencilFrame";

type PaperCardProps = {
  children: ReactNode;
  className?: string;
  /** Visually muted / offline */
  muted?: boolean;
  as?: "div" | "article" | "section";
};

export function PaperCard({
  children,
  className = "",
  muted = false,
  as: Tag = "div",
}: PaperCardProps) {
  return (
    <Tag
      className={[
        "paper-card relative",
        muted ? "paper-card--muted" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PencilFrame
        className="paper-stroke pointer-events-none absolute inset-0 h-full w-full text-[var(--ink)]"
        dashed={muted}
        strokeWidth={muted ? 1.35 : 1.7}
      />
      <div className="relative z-[1]">{children}</div>
    </Tag>
  );
}
