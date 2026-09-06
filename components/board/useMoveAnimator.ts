"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BoardOrientation,
  BoardPiece,
  PieceType,
  Promotion,
  Square,
} from "@/lib/chess/types";
import { squareToCoords } from "@/lib/chess/types";

export const TRAVEL_MS = 280;
export const LANDING_MS = 60;
export const CAPTURE_MS = 160;
export const CASTLE_ROOK_DELAY_MS = 100;
export const PROMOTION_MS = 200;
export const LIFT_SHADOW_PEAK = 1;

export type AnimMove = {
  from: Square;
  to: Square;
  type: PieceType;
  color: BoardPiece["color"];
  captured?: { type: PieceType; color: BoardPiece["color"]; square: Square };
  isKnight: boolean;
  isCastle: boolean;
  rookFrom?: Square;
  rookTo?: Square;
  promotion?: Promotion;
};

type QueueItem = {
  move: AnimMove;
  after: BoardPiece[];
};

export type MotionPiece = {
  key: string;
  type: PieceType;
  color: BoardPiece["color"];
  file: number;
  rank: number;
  square: Square;
  opacity: number;
  scale: number;
  rotateDeg: number;
  arcY: number;
  shadow: number;
  zIndex: number;
  interactive: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function displayCoords(
  square: Square,
  orientation: BoardOrientation,
): { file: number; rank: number } {
  const { file, rank } = squareToCoords(square);
  if (orientation === "white") {
    return { file, rank: 7 - rank };
  }
  return { file: 7 - file, rank };
}

function pieceKey(p: BoardPiece, disambiguator: string): string {
  return `${p.color}${p.type}-${p.square}-${disambiguator}`;
}

export function deriveAnimMove(
  prev: BoardPiece[],
  next: BoardPiece[],
): AnimMove | null {
  const prevMap = new Map(prev.map((p) => [p.square, p]));
  const nextMap = new Map(next.map((p) => [p.square, p]));

  const vacated: Square[] = [];
  for (const p of prev) {
    const n = nextMap.get(p.square);
    if (!n || n.color !== p.color || n.type !== p.type) {
      vacated.push(p.square);
    }
  }

  const appeared: BoardPiece[] = [];
  for (const n of next) {
    const p = prevMap.get(n.square);
    if (!p || p.color !== n.color || p.type !== n.type) {
      appeared.push(n);
    }
  }

  if (vacated.length === 0 || appeared.length === 0) {
    return null;
  }

  const kingVacated = vacated
    .map((sq) => prevMap.get(sq)!)
    .filter((p) => p.type === "k");
  if (kingVacated.length === 1 && vacated.length === 2 && appeared.length === 2) {
    const kingFrom = kingVacated[0].square;
    const kingToPiece = appeared.find(
      (p) => p.type === "k" && p.color === kingVacated[0].color,
    );
    const rookFrom = vacated.find((sq) => sq !== kingFrom)!;
    const rookToPiece = appeared.find((p) => p.type === "r")!;
    if (kingToPiece) {
      return {
        from: kingFrom,
        to: kingToPiece.square,
        type: "k",
        color: kingVacated[0].color,
        isKnight: false,
        isCastle: true,
        rookFrom,
        rookTo: rookToPiece.square,
      };
    }
  }

  let from: Square | null = null;
  let mover: BoardPiece | null = null;
  let toPiece: BoardPiece | null = null;

  for (const sq of vacated) {
    const p = prevMap.get(sq)!;
    if (p.type === "p") {
      const promo = appeared.find(
        (a) =>
          a.color === p.color &&
          a.type !== "p" &&
          a.square[0] === sq[0],
      );
      if (promo) {
        from = sq;
        mover = p;
        toPiece = promo;
        break;
      }
    }
    const match = appeared.find((a) => a.color === p.color && a.type === p.type);
    if (match) {
      from = sq;
      mover = p;
      toPiece = match;
      break;
    }
  }

  if (!from || !mover || !toPiece) {
    from = vacated[0];
    mover = prevMap.get(from)!;
    toPiece = appeared.find((a) => a.color === mover!.color) ?? appeared[0];
  }

  const to = toPiece.square;
  const prevOnTo = prevMap.get(to);
  let captured: AnimMove["captured"];
  if (prevOnTo && prevOnTo.color !== mover.color) {
    captured = { type: prevOnTo.type, color: prevOnTo.color, square: to };
  } else {
    const ep = vacated
      .filter((sq) => sq !== from)
      .map((sq) => prevMap.get(sq)!)
      .find((p) => p.color !== mover!.color && p.type === "p");
    if (ep) {
      captured = { type: "p", color: ep.color, square: ep.square };
    }
  }

  const promotion: Promotion | undefined =
    mover.type === "p" && toPiece.type !== "p"
      ? (toPiece.type as Promotion)
      : undefined;

  return {
    from,
    to,
    type: mover.type,
    color: mover.color,
    captured,
    isKnight: mover.type === "n",
    isCastle: false,
    promotion,
  };
}

function boardsEqual(a: BoardPiece[], b: BoardPiece[]): boolean {
  if (a.length !== b.length) return false;
  const key = (p: BoardPiece) => `${p.square}:${p.color}${p.type}`;
  const setB = new Set(b.map(key));
  return a.every((p) => setB.has(key(p)));
}

export function buildAnimMoveFromCommit(
  prev: BoardPiece[],
  from: Square,
  to: Square,
  next: BoardPiece[],
  promotion?: Promotion,
): AnimMove {
  const derived = deriveAnimMove(prev, next);
  if (derived) {
    return { ...derived, promotion: promotion ?? derived.promotion };
  }
  const mover = prev.find((p) => p.square === from)!;
  const capturedPiece = prev.find((p) => p.square === to);
  return {
    from,
    to,
    type: mover.type,
    color: mover.color,
    captured:
      capturedPiece && capturedPiece.color !== mover.color
        ? {
            type: capturedPiece.type,
            color: capturedPiece.color,
            square: to,
          }
        : undefined,
    isKnight: mover.type === "n",
    isCastle:
      mover.type === "k" &&
      Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) > 1,
    promotion,
  };
}

export function useMoveAnimator({ orientation }: { orientation: BoardOrientation }) {
  const [motionPieces, setMotionPieces] = useState<MotionPiece[] | null>(null);
  const [busy, setBusy] = useState(false);

  const targetRef = useRef<BoardPiece[]>([]);
  const displayRef = useRef<BoardPiece[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  const runningRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const seqRef = useRef(0);
  const orientationRef = useRef(orientation);
  orientationRef.current = orientation;

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const buildIdleMotion = useCallback(
    (pieces: BoardPiece[], selected: Square | null): MotionPiece[] => {
      const orient = orientationRef.current;
      return pieces.map((p) => {
        const { file, rank } = displayCoords(p.square, orient);
        const lifted = selected === p.square;
        return {
          key: pieceKey(p, "idle"),
          type: p.type,
          color: p.color,
          file,
          rank,
          square: p.square,
          opacity: 1,
          scale: lifted ? 1.08 : 1,
          rotateDeg: 0,
          arcY: 0,
          shadow: lifted ? LIFT_SHADOW_PEAK : 0,
          zIndex: lifted ? 30 : 10,
          interactive: true,
        };
      });
    },
    [],
  );

  const snapTo = useCallback(
    (pieces: BoardPiece[], selected: Square | null = null) => {
      clearTimers();
      queueRef.current = [];
      runningRef.current = false;
      displayRef.current = pieces;
      targetRef.current = pieces;
      setBusy(false);
      setMotionPieces(buildIdleMotion(pieces, selected));
    },
    [buildIdleMotion, clearTimers],
  );

  const runNext = useCallback(() => {
    if (runningRef.current) return;

    if (queueRef.current.length > 2) {
      queueRef.current = [];
      snapTo(targetRef.current, null);
      return;
    }

    const item = queueRef.current.shift();
    if (!item) {
      setBusy(false);
      displayRef.current = targetRef.current;
      setMotionPieces(buildIdleMotion(targetRef.current, null));
      return;
    }

    const { move, after } = item;
    const orient = orientationRef.current;

    if (prefersReducedMotion()) {
      displayRef.current = after;
      if (queueRef.current.length === 0) {
        setBusy(false);
        setMotionPieces(buildIdleMotion(targetRef.current, null));
      } else {
        runNext();
      }
      return;
    }

    runningRef.current = true;
    setBusy(true);
    seqRef.current += 1;
    const seq = seqRef.current;

    const fromPos = displayCoords(move.from, orient);
    const toPos = displayCoords(move.to, orient);

    const settled = after.filter((p) => {
      if (p.square === move.to) return false;
      if (move.isCastle && move.rookTo && p.square === move.rookTo) return false;
      return true;
    });

    const mkStatic = (p: BoardPiece): MotionPiece => {
      const { file, rank } = displayCoords(p.square, orient);
      return {
        key: pieceKey(p, `s${seq}`),
        type: p.type,
        color: p.color,
        file,
        rank,
        square: p.square,
        opacity: 1,
        scale: 1,
        rotateDeg: 0,
        arcY: 0,
        shadow: 0,
        zIndex: 10,
        interactive: false,
      };
    };

    let moverFile = fromPos.file;
    let moverRank = fromPos.rank;
    let moverArc = 0;
    let moverScale = 1.08;
    let moverShadow = LIFT_SHADOW_PEAK;
    let moverOpacity = 1;
    let moverType: PieceType = move.promotion ? "p" : move.type;

    let rookFile = move.rookFrom ? displayCoords(move.rookFrom, orient).file : 0;
    let rookRank = move.rookFrom ? displayCoords(move.rookFrom, orient).rank : 0;
    const rookActive = Boolean(move.isCastle && move.rookFrom && move.rookTo);

    let capOpacity = 1;
    let capScale = 1;
    let capRotate = 0;
    const capPos = move.captured
      ? displayCoords(move.captured.square, orient)
      : null;

    let promoIn: MotionPiece | null = null;

    const publish = () => {
      const list: MotionPiece[] = settled.map(mkStatic);
      list.push({
        key: `mover-${seq}`,
        type: moverType,
        color: move.color,
        file: moverFile,
        rank: moverRank,
        square: move.to,
        opacity: moverOpacity,
        scale: moverScale,
        rotateDeg: 0,
        arcY: moverArc,
        shadow: moverShadow,
        zIndex: 40,
        interactive: false,
      });
      if (rookActive && move.rookTo) {
        list.push({
          key: `rook-${seq}`,
          type: "r",
          color: move.color,
          file: rookFile,
          rank: rookRank,
          square: move.rookTo,
          opacity: 1,
          scale: 1,
          rotateDeg: 0,
          arcY: 0,
          shadow: 0,
          zIndex: 35,
          interactive: false,
        });
      }
      if (move.captured && capPos && capOpacity > 0.02) {
        list.push({
          key: `cap-${seq}`,
          type: move.captured.type,
          color: move.captured.color,
          file: capPos.file,
          rank: capPos.rank,
          square: move.captured.square,
          opacity: capOpacity,
          scale: capScale,
          rotateDeg: capRotate,
          arcY: 0,
          shadow: 0,
          zIndex: 15,
          interactive: false,
        });
      }
      if (promoIn) list.push(promoIn);
      setMotionPieces(list);
    };

    publish();

    const t0 = window.setTimeout(() => {
      moverFile = toPos.file;
      moverRank = toPos.rank;
      if (move.isKnight) moverArc = -55;
      moverScale = 1.04;
      moverShadow = 0.35;
      if (move.captured) {
        capOpacity = 0;
        capScale = 0.85;
        capRotate = 2;
      }
      publish();
    }, 16);
    timersRef.current.push(t0);

    if (move.isKnight) {
      timersRef.current.push(
        window.setTimeout(() => {
          moverArc = 0;
          publish();
        }, TRAVEL_MS / 2),
      );
    }

    if (rookActive && move.rookTo) {
      const rookToPos = displayCoords(move.rookTo, orient);
      timersRef.current.push(
        window.setTimeout(() => {
          rookFile = rookToPos.file;
          rookRank = rookToPos.rank;
          publish();
        }, CASTLE_ROOK_DELAY_MS),
      );
    }

    timersRef.current.push(
      window.setTimeout(() => {
        moverScale = 1;
        moverShadow = 0;
        moverArc = 0;
        publish();

        if (move.promotion) {
          moverOpacity = 0;
          moverScale = 0;
          promoIn = {
            key: `promo-in-${seq}`,
            type: move.promotion,
            color: move.color,
            file: toPos.file,
            rank: toPos.rank,
            square: move.to,
            opacity: 1,
            scale: 0,
            rotateDeg: 0,
            arcY: 0,
            shadow: 0,
            zIndex: 41,
            interactive: false,
          };
          publish();
          timersRef.current.push(
            window.setTimeout(() => {
              if (promoIn) {
                promoIn = { ...promoIn, scale: 1 };
                publish();
              }
            }, 16),
          );
        }
      }, TRAVEL_MS),
    );

    const doneAt =
      TRAVEL_MS +
      LANDING_MS +
      (move.promotion ? PROMOTION_MS : 0) +
      (move.isCastle ? CASTLE_ROOK_DELAY_MS : 0) +
      20;

    timersRef.current.push(
      window.setTimeout(() => {
        runningRef.current = false;
        displayRef.current = after;
        if (queueRef.current.length === 0) {
          setBusy(false);
          setMotionPieces(buildIdleMotion(targetRef.current, null));
        } else {
          runNext();
        }
      }, doneAt),
    );
  }, [buildIdleMotion, snapTo]);

  const playMove = useCallback(
    (move: AnimMove, after: BoardPiece[]) => {
      targetRef.current = after;
      if (prefersReducedMotion()) {
        snapTo(after, null);
        return;
      }
      queueRef.current.push({ move, after });
      if (queueRef.current.length > 2) {
        queueRef.current = [];
        snapTo(after, null);
        return;
      }
      if (!runningRef.current) runNext();
    },
    [runNext, snapTo],
  );

  const syncBoard = useCallback(
    (
      nextPieces: BoardPiece[],
      options?: {
        previous?: BoardPiece[];
        selected?: Square | null;
        forceSnap?: boolean;
      },
    ) => {
      const previous = options?.previous ?? displayRef.current;
      targetRef.current = nextPieces;

      if (
        options?.forceSnap ||
        prefersReducedMotion() ||
        previous.length === 0 ||
        boardsEqual(previous, nextPieces)
      ) {
        snapTo(nextPieces, options?.selected ?? null);
        return;
      }

      const move = deriveAnimMove(previous, nextPieces);
      if (!move) {
        snapTo(nextPieces, options?.selected ?? null);
        return;
      }

      playMove(move, nextPieces);
    },
    [playMove, snapTo],
  );

  const setSelectedLift = useCallback(
    (pieces: BoardPiece[], selected: Square | null) => {
      if (busy || runningRef.current || queueRef.current.length > 0) return;
      targetRef.current = pieces;
      displayRef.current = pieces;
      setMotionPieces(buildIdleMotion(pieces, selected));
    },
    [buildIdleMotion, busy],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!busy) {
      setMotionPieces(buildIdleMotion(targetRef.current, null));
    }
  }, [orientation, buildIdleMotion, busy]);

  return {
    motionPieces,
    busy,
    syncBoard,
    playMove,
    snapTo,
    setSelectedLift,
  };
}
