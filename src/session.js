// src/session.js
import { GAME } from './constants.js';

export function createSession() {
  return { score: 0, coins: 0, lives: GAME.startLives, power: 'small', levelIndex: 0 };
}

export function addScore(session, points) {
  session.score += points;
}

export function addCoin(session) {
  session.coins += 1;
  if (session.coins >= GAME.coinsForLife) {
    session.coins -= GAME.coinsForLife;
    session.lives += 1;
    return true;
  }
  return false;
}

export function loseLife(session) {
  session.lives -= 1;
  session.power = 'small';
  return session.lives;
}

export function advanceLevel(session, levelCount) {
  session.levelIndex += 1;
  return session.levelIndex < levelCount;
}
