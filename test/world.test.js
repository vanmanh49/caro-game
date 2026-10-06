import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateWorld } from '../src/world.js';
import { resolveInteractions } from '../src/interactions.js';
import { GAME } from '../src/constants.js';
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
