// src/camera.js
import { ENEMY } from './constants.js';
import { view } from './viewport.js';

export function createCamera(levelWidth) {
  // The view can be resized mid-level, so the bounds are read live.
  const maxX = () => Math.max(0, levelWidth - view.w);
  const target = (centerX) => Math.min(maxX(), Math.max(0, centerX - view.w / 2));
  const cam = {
    x: 0,
    px: 0,
    get maxX() {
      return maxX();
    },
    update(centerX) {
      cam.px = cam.x;
      cam.x = target(centerX);
    },
    snapTo(centerX) {
      cam.x = cam.px = target(centerX);
    },
    renderX(alpha) {
      return Math.min(maxX(), cam.px + (cam.x - cam.px) * alpha);
    },
  };
  return cam;
}

export function inActiveRange(camera, body) {
  return body.x + body.w > camera.x - ENEMY.activeBehind && body.x < camera.x + view.w + ENEMY.activeAhead;
}
