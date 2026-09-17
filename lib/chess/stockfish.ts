/**
 * Stockfish WASM via Web Worker.
 * Proposes moves only — lib/chess/engine.ts still validates and applies.
 */

export type StockfishLevel = "beginner" | "casual" | "club" | "strong";

export const STOCKFISH_LEVELS: {
  id: StockfishLevel;
  label: string;
  depth: number;
  skill: number;
  blurb: string;
}[] = [
  { id: "beginner", label: "Beginner", depth: 1, skill: 0, blurb: "~800" },
  { id: "casual", label: "Casual", depth: 5, skill: 5, blurb: "~1200" },
  { id: "club", label: "Club", depth: 10, skill: 12, blurb: "~1600" },
  { id: "strong", label: "Strong", depth: 15, skill: 20, blurb: "~2000+" },
];

function levelConfig(level: StockfishLevel) {
  return STOCKFISH_LEVELS.find((l) => l.id === level) ?? STOCKFISH_LEVELS[1];
}

type Pending = {
  resolve: (uci: string | null) => void;
  reject: (error: Error) => void;
};

export class StockfishEngine {
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private disposed = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.disposed) {
      throw new Error("stockfish_disposed");
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.boot();
    try {
      await this.initPromise;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  private boot(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Classic worker from /public so the SW can precache it.
      const worker = new Worker("/stockfish/stockfish.js");
      this.worker = worker;

      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      worker.onmessage = (event: MessageEvent<string>) => {
        this.handleMessage(String(event.data));
      };
      worker.onerror = (event) => {
        fail(new Error(event.message || "stockfish_worker_error"));
      };

      const waitFor = (token: string, timeoutMs = 20000) =>
        new Promise<void>((res, rej) => {
          const timer = setTimeout(() => {
            cleanup();
            rej(new Error(`stockfish_timeout_${token}`));
          }, timeoutMs);

          const onMessage = (event: MessageEvent<string>) => {
            const line = String(event.data);
            if (line === token || line.startsWith(`${token} `)) {
              cleanup();
              res();
            }
          };

          const cleanup = () => {
            clearTimeout(timer);
            worker.removeEventListener("message", onMessage);
          };

          worker.addEventListener("message", onMessage);
        });

      void (async () => {
        try {
          this.post("uci");
          await waitFor("uciok");
          this.post("isready");
          await waitFor("readyok");
          settled = true;
          resolve();
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    });
  }

  private post(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private handleMessage(line: string) {
    if (line.startsWith("bestmove")) {
      const parts = line.split(/\s+/);
      const best = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
      if (this.pending) {
        this.pending.resolve(best);
        this.pending = null;
      }
    }
  }

  /**
   * Ask Stockfish for a UCI move. Cancels any in-flight search first.
   */
  async getBestMove(fen: string, level: StockfishLevel): Promise<string | null> {
    if (this.disposed) {
      throw new Error("stockfish_disposed");
    }
    await this.init();

    // Abort previous think so leaving mid-game doesn't leave a dangling promise forever.
    if (this.pending) {
      this.post("stop");
      this.pending.resolve(null);
      this.pending = null;
    }

    const { depth, skill } = levelConfig(level);

    this.post("ucinewgame");
    this.post(`setoption name Skill Level value ${skill}`);
    this.post(`position fen ${fen}`);

    return new Promise<string | null>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.post(`go depth ${depth}`);
    });
  }

  /** Stop thinking and terminate the worker (no leak). */
  dispose() {
    this.disposed = true;
    if (this.pending) {
      this.post("stop");
      this.pending.resolve(null);
      this.pending = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
  }
}

export function createStockfish(): StockfishEngine {
  return new StockfishEngine();
}
