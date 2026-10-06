import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCamera, inActiveRange } from '../src/camera.js';
import { VIEW_W } from '../src/constants.js';

test('centers on the target', () => {
  const cam = createCamera(1000);
  cam.update(500);
  assert.equal(cam.x, 500 - VIEW_W / 2);
});

test('clamps at the left edge and at the right edge', () => {
  const cam = createCamera(1000);
  cam.update(10);
  assert.equal(cam.x, 0);
  cam.update(990);
  assert.equal(cam.x, 1000 - VIEW_W);
});

test('a level narrower than the view never scrolls', () => {
  const cam = createCamera(200);
  cam.update(150);
  assert.equal(cam.x, 0);
});

test('snapTo sets x and px together; renderX interpolates', () => {
  const cam = createCamera(1000);
  cam.snapTo(300);
  assert.equal(cam.px, cam.x);
  cam.update(500);
  assert.equal(cam.renderX(0.5), (300 - VIEW_W / 2 + (500 - VIEW_W / 2)) / 2);
});

test('inActiveRange covers the view plus a margin on each side', () => {
  const cam = createCamera(2000);
  cam.snapTo(100 + VIEW_W / 2);
  assert.equal(cam.x, 100);
  assert.equal(inActiveRange(cam, { x: 100 + VIEW_W + 20, w: 14 }), true);
  assert.equal(inActiveRange(cam, { x: 100 + VIEW_W + 40, w: 14 }), false);
  assert.equal(inActiveRange(cam, { x: 100 - 60, w: 14 }), true);
  assert.equal(inActiveRange(cam, { x: 100 - 100, w: 14 }), false);
});
