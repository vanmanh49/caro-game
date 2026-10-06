import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateWorld } from '../src/world.js';
import { resolveInteractions } from '../src/interactions.js';
import { GAME, PLAYER, TILE } from '../src/constants.js';
import { Fireball } from '../src/entities/fireball.js';
import { makeWorld, idleInput } from './helpers.js';

const DT = 1 / 60;
const first = (world, kind) => world.entities.find((e) => e.kind === kind);
const run = (world, steps) => {
  for (let i = 0; i < steps; i++) updateWorld(world, DT, idleInput);
};

// The player is falling onto the enemy's head.
function dropOnto(world, enemy) {
  const p = world.player.body;
  p.x = enemy.body.x;
  p.y = enemy.body.y - p.h + 3;
  p.py = enemy.body.y - p.h - 4;
  p.vy = 100;
}

// The player is standing next to the enemy (not falling), dx pixels to its right.
function standBeside(world, enemy, dx = -8) {
  const p = world.player.body;
  p.x = enemy.body.x + dx;
  p.y = enemy.body.y + enemy.body.h - p.h;
  p.py = p.y;
  p.vy = 0;
}

test('createWorld spawns entities from the level', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; g[11][12] = 'K'; g[11][14] = 'C'; } });
  assert.deepEqual(world.entities.map((e) => e.kind).sort(), ['coin', 'goomba', 'koopa']);
});

test('stomping a goomba squashes it, bounces the player and scores', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  dropOnto(world, g);
  resolveInteractions(world);
  assert.equal(g.state, 'squashed');
  assert.ok(world.player.body.vy < 0);
  assert.equal(world.session.score, 100);
  assert.equal(world.player.stompChain, 1);
  assert.equal(world.player.state, 'alive');
  assert.ok(world.audio.calls.includes('stomp'));
});

test('consecutive stomps without landing score 100 then 200', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; g[11][12] = 'G'; } });
  const [g1, g2] = world.entities.filter((e) => e.kind === 'goomba');
  dropOnto(world, g1);
  resolveInteractions(world);
  dropOnto(world, g2);
  resolveInteractions(world);
  assert.equal(world.session.score, 300);
});

test('walking into a goomba kills a small player', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  standBeside(world, g);
  resolveInteractions(world);
  assert.equal(world.player.state, 'dying');
  assert.equal(g.state, 'walk');
});

test('a big player hit from the side shrinks, blinks, and the goomba survives', () => {
  const world = makeWorld({ power: 'big', edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  standBeside(world, g);
  resolveInteractions(world);
  assert.equal(world.player.state, 'alive');
  assert.equal(world.player.power, 'small');
  assert.ok(world.player.invincible > 0);
  assert.equal(g.state, 'walk');
});

test('an invincible player ignores enemy contact', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  world.player.invincible = 1;
  standBeside(world, g);
  resolveInteractions(world);
  assert.equal(world.player.state, 'alive');
});

test('enemies outside the active range are inert', () => {
  const world = makeWorld({ edit: (g) => { g[11][30] = 'G'; } });
  const g = first(world, 'goomba');
  standBeside(world, g);
  resolveInteractions(world);
  assert.equal(world.player.state, 'alive');
});

test('a stomped koopa becomes a shell that cannot be kicked or hurt you for a moment', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'K'; } });
  const k = first(world, 'koopa');
  dropOnto(world, k);
  resolveInteractions(world);
  assert.equal(k.state, 'shell');
  standBeside(world, k);
  resolveInteractions(world);
  assert.equal(k.state, 'shell');
  assert.equal(world.player.state, 'alive');
});

test('kicking a stationary shell sends it away from the player without hurting them', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'K'; } });
  const k = first(world, 'koopa');
  k.state = 'shell';
  standBeside(world, k, -8);
  resolveInteractions(world);
  assert.equal(k.state, 'slide');
  assert.equal(k.dir, 1);
  assert.equal(world.player.state, 'alive');
  assert.equal(world.player.power, 'small');
  resolveInteractions(world); // same contact on the next frame
  assert.equal(world.player.state, 'alive');
  k.kickCooldown = 0;
  resolveInteractions(world); // a sliding shell that comes back does hurt
  assert.equal(world.player.state, 'dying');
});

test('a shell kicked from its right side slides left', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'K'; } });
  const k = first(world, 'koopa');
  k.state = 'shell';
  standBeside(world, k, 8);
  resolveInteractions(world);
  assert.equal(k.dir, -1);
});

test('stomping a sliding shell stops it', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'K'; } });
  const k = first(world, 'koopa');
  k.state = 'slide';
  dropOnto(world, k);
  resolveInteractions(world);
  assert.equal(k.state, 'shell');
  assert.equal(world.player.state, 'alive');
});

test('a sliding shell knocks out other enemies and scores', () => {
  const world = makeWorld({ edit: (g) => { g[11][8] = 'K'; g[11][9] = 'G'; } });
  const k = first(world, 'koopa');
  const g = first(world, 'goomba');
  k.state = 'slide';
  k.dir = 1;
  k.body.x = g.body.x - 10;
  resolveInteractions(world);
  assert.equal(g.state, 'knocked');
  assert.equal(world.session.score, GAME.scores.shellKill);
});

test('walking over a coin collects it', () => {
  const world = makeWorld({ edit: (g) => { g[11][3] = 'C'; } });
  const c = first(world, 'coin');
  world.player.body.x = c.body.x - 2;
  resolveInteractions(world);
  assert.equal(c.alive, false);
  assert.equal(world.session.coins, 1);
  assert.equal(world.session.score, GAME.scores.coin);
  assert.ok(world.audio.calls.includes('coin'));
});

test('the 100th coin plays the extra-life sound and adds a life', () => {
  const world = makeWorld({ edit: (g) => { g[11][3] = 'C'; } });
  world.session.coins = 99;
  const c = first(world, 'coin');
  world.player.body.x = c.body.x - 2;
  resolveInteractions(world);
  assert.equal(world.session.lives, GAME.startLives + 1);
  assert.ok(world.audio.calls.includes('oneup'));
});

test('a goomba turns around when it hits a wall', () => {
  const world = makeWorld({ edit: (g) => { g[11][8] = '|'; g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  run(world, 90);
  assert.equal(g.dir, 1);
  assert.ok(g.body.x >= 9 * 16);
});

test('a goomba that walks into a pit falls out of the world and is removed', () => {
  const world = makeWorld({
    edit: (g) => {
      for (const c of [9, 10, 11]) { g[12][c] = '.'; g[13][c] = '.'; }
      g[11][10] = 'G';
    },
  });
  run(world, 120);
  assert.equal(first(world, 'goomba'), undefined);
});

test('a squashed goomba disappears after a moment', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  dropOnto(world, g);
  resolveInteractions(world);
  run(world, 45);
  assert.equal(first(world, 'goomba'), undefined);
});

test('stomping two adjacent goombas in one pass does not hurt the player', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; g[11][11] = 'G'; } });
  const [g1, g2] = world.entities.filter((e) => e.kind === 'goomba');
  dropOnto(world, g1);
  world.player.body.x = g1.body.x + 8; // overlaps both heads
  resolveInteractions(world);
  assert.equal(g1.state, 'squashed');
  assert.equal(g2.state, 'squashed');
  assert.equal(world.player.state, 'alive');
  assert.equal(world.session.score, 300);
});

const fireInput = { isDown: () => false, wasPressed: (a) => a === 'fire' };

test('a fire player shoots at most two fireballs at a time', () => {
  const world = makeWorld({ power: 'fire' });
  for (let i = 0; i < 3; i++) updateWorld(world, DT, fireInput);
  assert.equal(world.entities.filter((e) => e.isFireball).length, 2);
  assert.ok(world.audio.calls.includes('fireball'));
});

test('only a fire player can shoot', () => {
  const world = makeWorld({ power: 'big' });
  updateWorld(world, DT, fireInput);
  assert.equal(world.entities.filter((e) => e.isFireball).length, 0);
});

test('a fireball knocks out an enemy and is consumed', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  const fb = world.spawn(new Fireball(g.body.x, g.body.y, 1));
  resolveInteractions(world);
  assert.equal(g.state, 'knocked');
  assert.equal(fb.alive, false);
  assert.equal(world.session.score, GAME.scores.fireballKill);
});

test('a fireball bounces along the ground and dies on a wall', () => {
  const world = makeWorld({ edit: (g) => { for (let r = 6; r <= 11; r++) g[r][12] = '#'; } });
  const fb = world.spawn(new Fireball(100, 160, 1));
  let bounced = false;
  let landedOnce = false;
  for (let i = 0; i < 180 && fb.alive; i++) {
    updateWorld(world, DT, idleInput);
    if (fb.body.onGround) landedOnce = true;
    if (landedOnce && fb.body.vy < 0) bounced = true;
  }
  assert.equal(bounced, true);
  assert.equal(fb.alive, false);
});

function touchPole(world) {
  const pole = world.pole;
  Object.assign(world.player.body, { x: pole.x - 5, y: 120, py: 120, vy: 0 });
  updateWorld(world, DT, idleInput);
}

test('the goal pole spans nine tiles above the flag cell and the flag cell itself', () => {
  const world = makeWorld();
  assert.deepEqual(world.pole, { x: 37 * TILE + 7, y: 2 * TILE, w: 2, h: 10 * TILE });
});

test('touching the pole starts the flag sequence and stops the music', () => {
  const world = makeWorld();
  touchPole(world);
  assert.equal(world.player.state, 'flag');
  assert.ok(world.audio.calls.includes('stopMusic'));
  assert.ok(world.audio.calls.includes('flag'));
});

test('the flag sequence ends in done even when a wall blocks the walk-out', () => {
  const world = makeWorld();
  touchPole(world);
  const flagY0 = world.flagY;
  let steps = 0;
  while (world.player.state !== 'done' && steps < 60 * 8) {
    updateWorld(world, DT, idleInput);
    steps++;
  }
  assert.equal(world.player.state, 'done');
  assert.ok(world.flagY > flagY0, 'the pennant slid down');
  assert.ok(steps / 60 <= PLAYER.walkOutTimeout + 3, `took ${steps} steps`);
});

test('the level timer counts down while playing', () => {
  const world = makeWorld();
  const t0 = world.time;
  run(world, 60);
  assert.ok(Math.abs(world.time - (t0 - 1)) < 1e-6);
});

test('running out of time kills the player', () => {
  const world = makeWorld();
  world.time = 0.01;
  run(world, 3);
  assert.equal(world.time, 0);
  assert.equal(world.player.state, 'dying');
});

test('the timer stops once the flag is grabbed', () => {
  const world = makeWorld();
  touchPole(world);
  const t = world.time;
  run(world, 30);
  assert.equal(world.time, t);
});

test('the world freezes while the player is dying', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  world.player.die(world);
  const x0 = g.body.x;
  run(world, 30);
  assert.equal(g.body.x, x0);
});
