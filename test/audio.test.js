import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, noteFreq, SFX, LEAD, BASS } from '../src/audio.js';
import { createStore } from '../src/storage.js';

const REQUIRED_SFX = ['jump', 'coin', 'oneup', 'stomp', 'kick', 'powerup', 'sprout', 'fireball', 'brick', 'bump', 'shrink', 'death', 'flag', 'gameover'];
const WAVES = new Set(['square', 'triangle', 'sine', 'sawtooth', 'noise']);

const memory = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

class FakeAudioContext {
  static oscillators = 0;
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 44100;
    this.destination = {};
  }
  createGain() {
    return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n) => n };
  }
  createOscillator() {
    FakeAudioContext.oscillators++;
    return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n) => n, start() {}, stop() {} };
  }
  createBuffer(_channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    return { buffer: null, connect: (n) => n, start() {}, stop() {} };
  }
  resume() {}
  suspend() {}
}

test('noteFreq follows equal temperament', () => {
  assert.equal(noteFreq(69), 440);
  assert.ok(Math.abs(noteFreq(81) - 880) < 1e-9);
  assert.ok(Math.abs(noteFreq(57) - 220) < 1e-9);
});

test('every sound effect the game uses is defined and well-formed', () => {
  for (const name of REQUIRED_SFX) {
    const parts = SFX[name];
    assert.ok(Array.isArray(parts) && parts.length > 0, `missing SFX ${name}`);
    for (const p of parts) {
      assert.ok(WAVES.has(p.wave), `${name}: bad wave ${p.wave}`);
      assert.ok(p.dur > 0, `${name}: dur`);
      assert.ok(p.vol > 0 && p.vol <= 1, `${name}: vol`);
      assert.ok(p.delay >= 0, `${name}: delay`);
      assert.ok(Number.isFinite(p.from) && Number.isFinite(p.to), `${name}: frequencies`);
    }
  }
});

test('music tracks are well-formed and the lead and bass loop to the same length', () => {
  const beats = (track) => track.reduce((sum, [, b]) => sum + b, 0);
  for (const track of [LEAD, BASS]) {
    for (const [note, b] of track) {
      assert.ok(note === null || Number.isInteger(note), 'note is a MIDI integer or null');
      assert.ok(b > 0);
    }
  }
  assert.equal(beats(LEAD), beats(BASS));
});

test('without WebAudio every method is a safe no-op', () => {
  const audio = createAudio({ AudioContextClass: null });
  assert.doesNotThrow(() => {
    audio.unlock();
    audio.play('jump');
    audio.startMusic();
    audio.stopMusic();
    audio.setSuspended(true);
  });
  assert.equal(audio.toggleMute(), true);
  assert.equal(audio.isMuted(), true);
  assert.equal(audio.toggleMute(), false);
});

test('a context that throws on construction does not break the game', () => {
  const Throwing = class { constructor() { throw new Error('blocked'); } };
  const audio = createAudio({ AudioContextClass: Throwing });
  assert.doesNotThrow(() => {
    audio.unlock();
    audio.play('coin');
    audio.startMusic();
  });
});

test('nothing sounds before unlock; after unlock a sound creates its tones', () => {
  FakeAudioContext.oscillators = 0;
  const audio = createAudio({ AudioContextClass: FakeAudioContext });
  audio.play('jump');
  assert.equal(FakeAudioContext.oscillators, 0);
  audio.unlock();
  audio.play('jump');
  assert.equal(FakeAudioContext.oscillators, 1);
  audio.play('coin');
  assert.equal(FakeAudioContext.oscillators, 3);
});

test('mute silences sounds and is saved to the store', () => {
  FakeAudioContext.oscillators = 0;
  const store = createStore(memory());
  const audio = createAudio({ AudioContextClass: FakeAudioContext, store });
  audio.unlock();
  assert.equal(audio.toggleMute(), true);
  assert.equal(store.get('muted', false), true);
  audio.play('jump');
  assert.equal(FakeAudioContext.oscillators, 0);
  assert.equal(audio.toggleMute(), false);
  audio.play('jump');
  assert.equal(FakeAudioContext.oscillators, 1);
});

test('the saved mute setting is loaded on startup', () => {
  const store = createStore(memory({ 'pixel-plumber.muted': 'true' }));
  const audio = createAudio({ AudioContextClass: FakeAudioContext, store });
  assert.equal(audio.isMuted(), true);
});

test('music requested before unlock starts once unlocked', () => {
  FakeAudioContext.oscillators = 0;
  const audio = createAudio({ AudioContextClass: FakeAudioContext });
  try {
    audio.startMusic();
    assert.equal(FakeAudioContext.oscillators, 0);
    audio.unlock();
    assert.ok(FakeAudioContext.oscillators >= 3);
  } finally {
    audio.stopMusic();
  }
});
