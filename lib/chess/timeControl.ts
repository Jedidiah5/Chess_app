export type TimeControl = "blitz" | "rapid" | "untimed";

export const TIME_CONTROLS: Record<
  TimeControl,
  { label: string; initialMs: number; incrementMs: number }
> = {
  blitz: { label: "Blitz (5+0)", initialMs: 5 * 60 * 1000, incrementMs: 0 },
  rapid: { label: "Rapid (10+0)", initialMs: 10 * 60 * 1000, incrementMs: 0 },
  untimed: { label: "Untimed", initialMs: 0, incrementMs: 0 },
};
