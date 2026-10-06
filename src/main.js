// src/main.js
import { VIEW_H } from './constants.js';
import { view, computeViewport, applyViewport } from './viewport.js';
import { startLoop } from './loop.js';
import { createInput } from './input.js';
import { createMachine } from './stateMachine.js';
import { createStates } from './states.js';
import { createStore } from './storage.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitToWindow() {
  applyViewport(canvas, ctx, computeViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio));
}
fitToWindow();
window.addEventListener('resize', fitToWindow);
window.addEventListener('orientationchange', fitToWindow);
document.addEventListener('fullscreenchange', fitToWindow);

function toggleFullscreen() {
  const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  request?.catch((e) => console.warn('Fullscreen unavailable:', e.message));
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFullscreen();
});

const input = createInput(window);
const store = createStore();
const audio = createAudio({ store });
const machine = createMachine(
  createStates({ input, audio, store, go: (name, payload) => machine.go(name, payload) }),
);

let paused = false;
function setPaused(value) {
  if (paused === value) return;
  paused = value;
  audio.setSuspended(value);
  if (!value) loop.resetClock();
}
window.addEventListener('blur', () => setPaused(true));
window.addEventListener('focus', () => setPaused(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
});
window.addEventListener('keydown', () => { if (!paused) audio.unlock(); });

const loop = startLoop({
  update(dt) {
    if (paused) return;
    if (input.wasPressed('mute')) audio.toggleMute();
    machine.update(dt);
    input.endFrame();
  },
  render(alpha) {
    machine.render(ctx, alpha);
    if (paused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, view.w, VIEW_H);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', view.w / 2, VIEW_H / 2);
    }
  },
  onError(e) {
    console.error(e);
    machine.go('error', { message: e.message || String(e) });
  },
});

machine.go('title');
