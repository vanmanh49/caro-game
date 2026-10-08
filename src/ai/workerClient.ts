import type { Difficulty, Position } from '../game/types';
import { abortError, createAIPlayer } from './aiPlayer';
import type { AIPlayer, WorkerRequest, WorkerResponse } from './types';

export interface DisposableAIPlayer extends AIPlayer {
  dispose(): void;
}

interface Pending {
  resolve: (move: Position) => void;
  reject: (error: Error) => void;
}

/** AI that runs in a Web Worker (one per player instance); falls back to the main thread if unavailable. */
export function createWorkerAIPlayer(difficulty: Difficulty, winLength: number): DisposableAIPlayer {
  const fallback = createAIPlayer(difficulty, { winLength });
  const pending = new Map<number, Pending>();
  let worker: Worker | null = null;
  let broken = typeof Worker === 'undefined';
  let nextId = 1;

  const failAll = (error: Error) => {
    for (const entry of pending.values()) entry.reject(error);
    pending.clear();
  };
  const kill = () => {
    worker?.terminate();
    worker = null;
  };

  function ensureWorker(): Worker | null {
    if (broken) return null;
    if (worker) return worker;
    try {
      const created = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
      created.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const entry = pending.get(event.data.id);
        if (!entry) return;
        pending.delete(event.data.id);
        if ('move' in event.data) entry.resolve(event.data.move);
        else entry.reject(new Error(event.data.error));
      };
      created.onerror = () => {
        broken = true;
        kill();
        failAll(new Error('AI worker failed'));
      };
      worker = created;
      return created;
    } catch {
      broken = true;
      return null;
    }
  }

  return {
    getMove(board, player, signal) {
      const active = ensureWorker();
      if (!active) return fallback.getMove(board, player, signal);
      return new Promise<Position>((resolve, reject) => {
        if (signal?.aborted) {
          reject(abortError());
          return;
        }
        const id = nextId++;
        pending.set(id, { resolve, reject });
        signal?.addEventListener(
          'abort',
          () => {
            if (!pending.delete(id)) return;
            reject(abortError());
            kill(); // stops a long search immediately; a fresh worker is created on demand
            failAll(abortError());
          },
          { once: true },
        );
        const request: WorkerRequest = { id, difficulty, board, player, winLength };
        active.postMessage(request);
      }).catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        return fallback.getMove(board, player, signal); // worker crashed: retry on the main thread
      });
    },
    dispose() {
      kill();
      failAll(abortError());
    },
  };
}
