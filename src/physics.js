// src/physics.js
import { TILE, PHYS } from './constants.js';
import { T, isSolid } from './tiles.js';

const EPS = 0.001;

export function createBody(x, y, w, h) {
  return { x, y, w, h, vx: 0, vy: 0, px: x, py: y, onGround: false };
}

export function applyGravity(body, dt, riseG = PHYS.gravityRise, fallG = PHYS.gravityFall) {
  const g = body.vy < 0 ? riseG : fallG;
  body.vy = Math.min(body.vy + g * dt, PHYS.maxFall);
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function renderPos(body, alpha) {
  return { x: body.px + (body.x - body.px) * alpha, y: body.py + (body.y - body.py) * alpha };
}

function span(body) {
  return {
    c0: Math.floor(body.x / TILE),
    c1: Math.floor((body.x + body.w - EPS) / TILE),
    r0: Math.floor(body.y / TILE),
    r1: Math.floor((body.y + body.h - EPS) / TILE),
  };
}

export function moveBody(body, tiles, dt) {
  body.px = body.x;
  body.py = body.y;
  const result = { wall: 0, ceiling: null, landed: false };

  // X axis first.
  body.x += body.vx * dt;
  if (body.vx !== 0) {
    const { c0, c1, r0, r1 } = span(body);
    if (body.vx > 0) {
      xRight: for (let c = c0; c <= c1; c++) {
        for (let r = r0; r <= r1; r++) {
          if (isSolid(tiles.get(c, r))) {
            body.x = c * TILE - body.w;
            result.wall = 1;
            body.vx = 0;
            break xRight;
          }
        }
      }
    } else {
      xLeft: for (let c = c1; c >= c0; c--) {
        for (let r = r0; r <= r1; r++) {
          if (isSolid(tiles.get(c, r))) {
            body.x = (c + 1) * TILE;
            result.wall = -1;
            body.vx = 0;
            break xLeft;
          }
        }
      }
    }
  }

  // Then the Y axis.
  body.y += body.vy * dt;
  const { c0, c1, r0, r1 } = span(body);
  if (body.vy > 0) {
    land: for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = tiles.get(c, r);
        const oneWayLanding = t === T.ONEWAY && body.py + body.h <= r * TILE + EPS;
        if (isSolid(t) || oneWayLanding) {
          body.y = r * TILE - body.h;
          body.vy = 0;
          result.landed = true;
          break land;
        }
      }
    }
  } else if (body.vy < 0) {
    let best = null;
    let bestOverlap = 0;
    for (let c = c0; c <= c1; c++) {
      if (!isSolid(tiles.get(c, r0))) continue;
      const overlap = Math.min(body.x + body.w, (c + 1) * TILE) - Math.max(body.x, c * TILE);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = { col: c, row: r0 };
      }
    }
    if (best) {
      body.y = (best.row + 1) * TILE;
      body.vy = 0;
      result.ceiling = best;
    }
  }

  body.onGround = result.landed;
  return result;
}
