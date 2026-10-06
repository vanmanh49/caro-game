// src/viewport.js
import { VIEW_MIN_W, VIEW_MAX_W, VIEW_H } from './constants.js';

// Live view state: width in logical pixels, and device pixels per logical pixel on each axis.
export const view = { w: VIEW_MIN_W, sx: 1, sy: 1 };

// The view is always VIEW_H tall; its width follows the window's aspect ratio within
// [VIEW_MIN_W, VIEW_MAX_W]. Outside that range the canvas is letterboxed or pillarboxed.
export function computeViewport(winW, winH, dpr) {
  const w = Math.max(1, winW);
  const h = Math.max(1, winH);
  const ratio = dpr > 0 ? dpr : 1;
  const viewW = Math.min(VIEW_MAX_W, Math.max(VIEW_MIN_W, (w / h) * VIEW_H));
  const scale = Math.min(w / viewW, h / VIEW_H);
  const cssW = viewW * scale;
  const cssH = VIEW_H * scale;
  return {
    viewW,
    cssW,
    cssH,
    pixelW: Math.max(1, Math.round(cssW * ratio)),
    pixelH: Math.max(1, Math.round(cssH * ratio)),
  };
}

export function applyViewport(canvas, ctx, v) {
  canvas.width = v.pixelW;
  canvas.height = v.pixelH;
  canvas.style.width = `${v.cssW}px`;
  canvas.style.height = `${v.cssH}px`;
  view.w = v.viewW;
  view.sx = v.pixelW / v.viewW;
  view.sy = v.pixelH / VIEW_H;
  // Resizing a canvas resets its context state.
  ctx.setTransform(view.sx, 0, 0, view.sy, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
