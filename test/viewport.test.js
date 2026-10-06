import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeViewport } from '../src/viewport.js';
import { VIEW_MIN_W, VIEW_MAX_W, VIEW_H } from '../src/constants.js';

test('a window at the base aspect ratio shows the base view and fills the window', () => {
  const v = computeViewport(512, 448, 1);
  assert.equal(v.viewW, VIEW_MIN_W);
  assert.deepEqual([v.cssW, v.cssH], [512, 448]);
  assert.deepEqual([v.pixelW, v.pixelH], [512, 448]);
});

test('a wider window widens the view instead of adding side bars', () => {
  const v = computeViewport(1280, 720, 1);
  assert.ok(Math.abs(v.viewW - (1280 / 720) * VIEW_H) < 1e-6);
  assert.deepEqual([v.cssW, v.cssH], [1280, 720]);
});

test('an ultrawide window caps the view width and pillarboxes', () => {
  const v = computeViewport(3440, 1000, 1);
  assert.equal(v.viewW, VIEW_MAX_W);
  assert.equal(v.cssH, 1000);
  assert.ok(Math.abs(v.cssW - (VIEW_MAX_W / VIEW_H) * 1000) < 1e-6);
  assert.ok(v.cssW < 3440);
});

test('a portrait window keeps the base view and letterboxes', () => {
  const v = computeViewport(390, 844, 1);
  assert.equal(v.viewW, VIEW_MIN_W);
  assert.equal(v.cssW, 390);
  assert.ok(Math.abs(v.cssH - (VIEW_H / VIEW_MIN_W) * 390) < 1e-6);
});

test('the backing store is sized in whole device pixels', () => {
  const v = computeViewport(1280, 720, 2);
  assert.deepEqual([v.pixelW, v.pixelH], [2560, 1440]);
  const odd = computeViewport(1001, 701, 1.5);
  assert.ok(Number.isInteger(odd.pixelW) && Number.isInteger(odd.pixelH));
});

test('degenerate window sizes still give a usable canvas', () => {
  const v = computeViewport(0, 0, 0);
  assert.equal(v.viewW, VIEW_MIN_W);
  assert.ok(v.pixelW >= 1 && v.pixelH >= 1);
});
