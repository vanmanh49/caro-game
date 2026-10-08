import { describe, expect, it } from 'vitest';
import { createWorkerAIPlayer } from '../src/ai/workerClient';
import { createBoard, isValidMove } from '../src/game/board';

describe('createWorkerAIPlayer without Worker support', () => {
  it('falls back to the main-thread AI', async () => {
    expect(typeof Worker).toBe('undefined');
    const player = createWorkerAIPlayer('hard', 5);
    const board = createBoard(15);
    const move = await player.getMove(board, 'X');
    expect(isValidMove(board, move)).toBe(true);
    player.dispose();
  });

  it('rejects with AbortError when aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const player = createWorkerAIPlayer('easy', 5);
    await expect(player.getMove(createBoard(15), 'X', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
