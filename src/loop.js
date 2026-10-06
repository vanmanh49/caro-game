// src/loop.js
import { STEP, MAX_FRAME } from './constants.js';

export function createStepper(step, maxFrame) {
  let acc = 0;
  return {
    advance(frameDt, update) {
      acc += Math.min(frameDt, maxFrame);
      while (acc >= step) {
        update(step);
        acc -= step;
      }
      return acc / step;
    },
    reset() {
      acc = 0;
    },
  };
}

export function startLoop({ update, render, raf = (f) => requestAnimationFrame(f), now = () => performance.now() }) {
  const stepper = createStepper(STEP, MAX_FRAME);
  let last = now();
  let running = true;
  function frame() {
    if (!running) return;
    const t = now();
    const dt = (t - last) / 1000;
    last = t;
    const alpha = stepper.advance(dt, update);
    render(alpha);
    raf(frame);
  }
  raf(frame);
  return {
    stop() {
      running = false;
    },
    resetClock() {
      last = now();
      stepper.reset();
    },
  };
}
