// src/levels/index.js
import { parseLevel } from '../level.js';
import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';

export const LEVELS = [
  { name: '1-1', text: level1 },
  { name: '1-2', text: level2 },
  { name: '1-3', text: level3 },
];

export function loadLevel(index) {
  const { name, text } = LEVELS[index];
  return parseLevel(name, text);
}
