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

export function startLoop({
  update,
  render,
  raf = (f) => requestAnimationFrame(f),
  now = () => performance.now(),
  onError,
}) {
  const stepper = createStepper(STEP, MAX_FRAME);
  let last = now();
  let running = true;
  function frame() {
    if (!running) return;
    try {
      const t = now();
      const dt = (t - last) / 1000;
      last = t;
      const alpha = stepper.advance(dt, update);
      render(alpha);
    } catch (e) {
      stepper.reset();
      try {
        if (onError) onError(e);
        else console.error(e);
      } catch (handlerError) {
        console.error(handlerError);
      }
    } finally {
      if (running) raf(frame);
    }
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
