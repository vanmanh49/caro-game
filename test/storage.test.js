import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/storage.js';

const memory = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

test('returns the fallback for a missing key and round-trips a value', () => {
  const store = createStore(memory());
  assert.equal(store.get('hiscore', 0), 0);
  store.set('hiscore', 4200);
  assert.equal(store.get('hiscore', 0), 4200);
});

test('returns the fallback when the stored JSON is corrupt', () => {
  const store = createStore(memory({ 'pixel-plumber.muted': '{not json' }));
  assert.equal(store.get('muted', false), false);
});

test('returns the fallback when the stored type does not match', () => {
  const store = createStore(memory({ 'pixel-plumber.hiscore': '"lots"' }));
  assert.equal(store.get('hiscore', 0), 0);
});

test('never throws when storage throws', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const store = createStore(broken);
  assert.equal(store.get('x', 7), 7);
  assert.doesNotThrow(() => store.set('x', 8));
});

test('works with no storage at all', () => {
  const store = createStore(null);
  assert.equal(store.get('x', 'fallback'), 'fallback');
  assert.doesNotThrow(() => store.set('x', 1));
});
