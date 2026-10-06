// src/states.js
import { VIEW_H, GAME } from './constants.js';
import { view } from './viewport.js';
import { LEVELS, loadLevel } from './levels/index.js';
import { createSession, addScore, loseLife, advanceLevel } from './session.js';
import { createWorld, updateWorld, renderWorld } from './world.js';
import { drawBackground } from './render.js';
import { drawSprite } from './sprites.js';
import { drawHud, formatScore } from './hud.js';

function text(ctx, str, x, y, { align = 'center', color = '#fff', size = 8 } = {}) {
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function drawGroundStrip(ctx) {
  for (let c = 0; c < view.w / 16; c++) {
    drawSprite(ctx, 'ground', c * 16, VIEW_H - 32);
    drawSprite(ctx, 'ground', c * 16, VIEW_H - 16);
  }
}

function wrap(str, width) {
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createStates({ input, audio, store, go, levelCount = LEVELS.length, load = loadLevel }) {
  let session = createSession();
  let world = null;
  let hiScore = store.get('hiscore', 0);
  let timer = 0;
  let bonus = 0;
  let message = '';

  const saveHiScore = () => {
    if (session.score > hiScore) {
      hiScore = session.score;
      store.set('hiscore', hiScore);
    }
  };

  return {
    title: {
      enter() {
        session = createSession();
        audio.stopMusic();
      },
      update() {
        if (input.wasPressed('start')) go('playing');
      },
      render(ctx) {
        drawBackground(ctx);
        drawGroundStrip(ctx);
        drawSprite(ctx, 'big_idle', view.w / 2 - 8, VIEW_H - 64);
        text(ctx, 'PIXEL PLUMBER', view.w / 2, 56, { size: 16 });
        text(ctx, 'PRESS ENTER OR SPACE', view.w / 2, 84);
        text(ctx, 'ARROWS/AD MOVE   SPACE JUMP', view.w / 2, 104);
        text(ctx, 'SHIFT RUN   X FIRE   M MUTE', view.w / 2, 116);
        text(ctx, 'F FULLSCREEN', view.w / 2, 128);
        text(ctx, `HI ${formatScore(hiScore)}`, view.w / 2, 148);
      },
    },

    playing: {
      enter() {
        try {
          world = createWorld({ level: load(session.levelIndex), session, audio });
        } catch (e) {
          console.error(e);
          go('error', { message: e.message });
          return;
        }
        audio.startMusic();
      },
      update(dt) {
        updateWorld(world, dt, input);
        const p = world.player;
        if (p.state === 'dead') {
          if (loseLife(session) <= 0) go('gameOver');
          else go('playing');
        } else if (p.state === 'done') {
          session.power = p.power;
          go('levelClear', { timeLeft: world.time });
        }
      },
      render(ctx, alpha) {
        renderWorld(world, ctx, alpha);
        drawHud(ctx, session, world.time, world.level.name);
      },
    },

    levelClear: {
      enter({ timeLeft }) {
        timer = 0;
        bonus = Math.ceil(timeLeft) * GAME.timeBonusPerSecond;
        addScore(session, bonus);
      },
      update(dt) {
        timer += dt;
        if (timer < GAME.clearScreenTime) return;
        if (advanceLevel(session, levelCount)) go('playing');
        else go('win');
      },
      render(ctx, alpha) {
        renderWorld(world, ctx, alpha);
        drawHud(ctx, session, 0, world.level.name);
        text(ctx, 'COURSE CLEAR!', view.w / 2, 90, { size: 16 });
        text(ctx, `TIME BONUS ${bonus}`, view.w / 2, 110);
      },
    },

    gameOver: {
      enter() {
        timer = 0;
        audio.stopMusic();
        saveHiScore();
        audio.play('gameover');
      },
      update(dt) {
        timer += dt;
        if (timer > 1 && input.wasPressed('start')) go('title');
      },
      render(ctx) {
        drawBackground(ctx);
        text(ctx, 'GAME OVER', view.w / 2, 90, { size: 16 });
        text(ctx, `SCORE ${formatScore(session.score)}`, view.w / 2, 116);
        text(ctx, `HI ${formatScore(hiScore)}`, view.w / 2, 130);
        text(ctx, 'PRESS ENTER OR SPACE', view.w / 2, 156);
      },
    },

    win: {
      enter() {
        timer = 0;
        audio.stopMusic();
        saveHiScore();
        audio.play('oneup');
      },
      update(dt) {
        timer += dt;
        if (timer > 1 && input.wasPressed('start')) go('title');
      },
      render(ctx) {
        drawBackground(ctx);
        drawGroundStrip(ctx);
        text(ctx, 'YOU WIN!', view.w / 2, 80, { size: 16 });
        text(ctx, `SCORE ${formatScore(session.score)}`, view.w / 2, 110);
        text(ctx, `HI ${formatScore(hiScore)}`, view.w / 2, 124);
        text(ctx, 'PRESS ENTER OR SPACE', view.w / 2, 150);
      },
    },

    error: {
      enter(payload) {
        message = payload?.message ?? 'Unknown error';
        audio.stopMusic();
      },
      update() {
        if (input.wasPressed('start')) go('title');
      },
      render(ctx) {
        ctx.fillStyle = '#400';
        ctx.fillRect(0, 0, view.w, VIEW_H);
        text(ctx, 'LEVEL ERROR', view.w / 2, 40, { size: 16, color: '#f88' });
        wrap(message, 48).forEach((line, i) => text(ctx, line, view.w / 2, 70 + i * 12, { color: '#fcc' }));
      },
    },
  };
}
