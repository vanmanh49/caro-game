// src/camera.js
import { VIEW_W, ENEMY } from './constants.js';

export function createCamera(levelWidth) {
  const maxX = Math.max(0, levelWidth - VIEW_W);
  const target = (centerX) => Math.min(maxX, Math.max(0, centerX - VIEW_W / 2));
  const cam = {
    x: 0,
    px: 0,
    maxX,
    update(centerX) {
      cam.px = cam.x;
      cam.x = target(centerX);
    },
    snapTo(centerX) {
      cam.x = cam.px = target(centerX);
    },
    renderX(alpha) {
      return cam.px + (cam.x - cam.px) * alpha;
    },
  };
  return cam;
}

export function inActiveRange(camera, body) {
  return body.x + body.w > camera.x - ENEMY.activeBehind && body.x < camera.x + VIEW_W + ENEMY.activeAhead;
}
