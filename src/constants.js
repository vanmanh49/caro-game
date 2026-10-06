// src/constants.js
export const TILE = 16;
export const VIEW_W = 256;
export const VIEW_H = 224;
export const LEVEL_ROWS = VIEW_H / TILE;
export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;

// Movement and gravity, in pixels and seconds.
export const PHYS = {
  gravityRise: 800,
  gravityFall: 1400,
  maxFall: 420,
  walkMax: 90,
  runMax: 150,
  accel: 380,
  airAccel: 260,
  friction: 420,
  skidDecel: 700,
  jumpVel: 330,
  jumpCutVel: 200,
  coyote: 0.1,
  buffer: 0.1,
  bounceVel: 220,
};

export const PLAYER = {
  sizes: {
    small: { w: 12, h: 15 },
    big: { w: 12, h: 31 },
    fire: { w: 12, h: 31 },
  },
  invincibleTime: 2,
  deathPause: 0.5,
  deathHopVel: 300,
  deathGravity: 900,
  deathTotal: 2.5,
  maxFireballs: 2,
  flagSlideSpeed: 110,
  flagDropSpeed: 220,
  walkOutSpeed: 70,
  walkOutDistance: 48,
  walkOutTimeout: 2,
};

export const ENEMY = {
  walkSpeed: 30,
  shellSpeed: 200,
  squashTime: 0.5,
  kickCooldown: 0.25,
  knockVel: 180,
  knockSpeed: 60,
  activeBehind: 64,
  activeAhead: 32,
};

export const ITEM = {
  riseTime: 0.5,
  mushroomSpeed: 50,
  fireballSpeed: 150,
  fireballBounce: 200,
  fireballGravity: 900,
  coinPopTime: 0.5,
  bumpTime: 0.15,
};

export const GAME = {
  startLives: 3,
  levelTime: 300,
  coinsForLife: 100,
  timeBonusPerSecond: 50,
  clearScreenTime: 3,
  scores: {
    coin: 200,
    brick: 50,
    powerUp: 1000,
    fireballKill: 100,
    shellKill: 500,
    stomp: [100, 200, 400, 500, 800, 1000, 2000, 4000, 8000],
  },
};
