import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyContact, stompScore, stompEnemy } from '../src/combat.js';
import { createBody } from '../src/physics.js';
import { createMotor } from '../src/movement.js';
import { createSession } from '../src/session.js';
import { PHYS, GAME } from '../src/constants.js';
import { mockAudio } from './helpers.js';

const enemy = () => createBody(100, 178, 14, 14); // vertical center at y = 185
const player = (y, py, vy) => {
  const b = createBody(100, y, 12, 15);
  b.py = py;
  b.vy = vy;
  return b;
};

test('falling onto an enemy from above is a stomp', () => {
  assert.equal(classifyContact(player(168, 160, 100), enemy()), 'stomp');
});

test('walking into an enemy is a side hit', () => {
  assert.equal(classifyContact(player(178, 178, 0), enemy()), 'side');
});

test('falling past the enemy from the side is a side hit', () => {
  assert.equal(classifyContact(player(176, 172, 100), enemy()), 'side');
});

test('rising into an enemy is a side hit', () => {
  assert.equal(classifyContact(player(168, 160, -100), enemy()), 'side');
});

test('stomp scores climb with the chain and stay at the cap', () => {
  assert.equal(stompScore(0), 100);
  assert.equal(stompScore(1), 200);
  assert.equal(stompScore(GAME.scores.stomp.length - 1), 8000);
  assert.equal(stompScore(50), 8000);
});

test('stompEnemy stomps, bounces the player, scores the chain and plays a sound', () => {
  let stomped = 0;
  const target = { stomp() { stomped++; } };
  const p = { body: createBody(0, 0, 12, 15), motor: createMotor(), stompChain: 0 };
  p.motor.jumping = true;
  const world = { session: createSession(), audio: mockAudio() };
  stompEnemy(world, p, target);
  stompEnemy(world, p, target);
  assert.equal(stomped, 2);
  assert.equal(p.body.vy, -PHYS.bounceVel);
  assert.equal(p.motor.jumping, false);
  assert.equal(world.session.score, 300);
  assert.equal(p.stompChain, 2);
  assert.deepEqual(world.audio.calls, ['stomp', 'stomp']);
});

test('classifyContact uses an explicit vy over the body vy', () => {
  assert.equal(classifyContact(player(168, 160, -100), enemy(), 100), 'stomp');
  assert.equal(classifyContact(player(168, 160, 100), enemy(), -100), 'side');
});
