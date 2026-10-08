import type { Difficulty } from '../game/types';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export const DIFFICULTY_DESCRIPTION: Record<Difficulty, string> = {
  easy: 'Makes mostly random moves.',
  medium: 'Understands basic threats and opportunities.',
  hard: 'Uses strategic decision making and deeper search.',
  expert: 'Uses advanced game strategy and deeper minimax/alpha-beta search.',
};
