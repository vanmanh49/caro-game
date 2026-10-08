import { computeMove } from './computeMove';
import type { WorkerRequest, WorkerResponse } from './types';

interface WorkerScope {
  postMessage(message: WorkerResponse): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerRequest>) => void): void;
}

const scope = self as unknown as WorkerScope;

scope.addEventListener('message', (event) => {
  const { id, difficulty, board, player, winLength } = event.data;
  try {
    scope.postMessage({ id, move: computeMove(difficulty, board, player, { winLength }) });
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
