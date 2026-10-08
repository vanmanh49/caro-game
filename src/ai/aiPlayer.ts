import type { Difficulty } from '../game/types';
import { computeMove, type ComputeOptions } from './computeMove';
import type { AIPlayer } from './types';

export function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

/** Runs the AI on the main thread, asynchronously (macro-task), so callers always get a Promise. */
export function createAIPlayer(difficulty: Difficulty, options: ComputeOptions): AIPlayer {
  return {
    getMove(board, player, signal) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(abortError());
          return;
        }
        setTimeout(() => {
          if (signal?.aborted) {
            reject(abortError());
            return;
          }
          try {
            resolve(computeMove(difficulty, board, player, options));
          } catch (error) {
            reject(error);
          }
        }, 0);
      });
    },
  };
}
