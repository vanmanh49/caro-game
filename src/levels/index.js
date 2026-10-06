// src/levels/index.js
import { parseLevel } from '../level.js';
import level1 from './level1.js';

export const LEVELS = [
  { name: '1-1', text: level1 },
];

export function loadLevel(index) {
  const { name, text } = LEVELS[index];
  return parseLevel(name, text);
}
