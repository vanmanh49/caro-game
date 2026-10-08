import type { Scoreboard } from '../game/scoreboard';
import { BOARD_SIZES, DIFFICULTIES, type GameSettings } from '../game/types';

export type Theme = 'light' | 'dark';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

export function isGameSettings(v: unknown): v is GameSettings {
  return (
    isRecord(v) &&
    (v.mode === 'pvc' || v.mode === 'pvp') &&
    typeof v.boardSize === 'number' &&
    (BOARD_SIZES as readonly number[]).includes(v.boardSize) &&
    (v.playerPiece === 'X' || v.playerPiece === 'O') &&
    (v.firstMover === 'player' || v.firstMover === 'computer' || v.firstMover === 'random') &&
    typeof v.difficulty === 'string' &&
    (DIFFICULTIES as readonly string[]).includes(v.difficulty)
  );
}

export function isScoreboard(v: unknown): v is Scoreboard {
  if (!isRecord(v) || !isRecord(v.pvc) || !isRecord(v.pvp)) return false;
  return (
    isCount(v.pvc.player) &&
    isCount(v.pvc.computer) &&
    isCount(v.pvc.draws) &&
    isCount(v.pvp.X) &&
    isCount(v.pvp.O) &&
    isCount(v.pvp.draws)
  );
}

export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
export const isThemeOrNull = (v: unknown): v is Theme | null => v === null || v === 'light' || v === 'dark';
