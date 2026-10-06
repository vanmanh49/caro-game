// src/audio.js
const MASTER_VOLUME = 0.5;
export const BEAT = 60 / 140;

export function noteFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

const tone = (wave, from, to, dur, vol = 0.12, delay = 0) => ({ wave, from, to, dur, vol, delay });
const arp = (freqs, step, dur, vol = 0.12) => freqs.map((f, i) => tone('square', f, f, dur, vol, i * step));

export const SFX = {
  jump: [tone('square', 260, 620, 0.16)],
  coin: [tone('square', 988, 988, 0.07), tone('square', 1319, 1319, 0.22, 0.12, 0.07)],
  oneup: arp([659, 784, 1319, 1047, 1175, 1568], 0.1, 0.1),
  stomp: [tone('square', 320, 90, 0.1, 0.15)],
  kick: [tone('square', 220, 120, 0.08, 0.15)],
  powerup: arp([523, 659, 784, 1047, 1319, 1568], 0.07, 0.08),
  sprout: [tone('triangle', 200, 700, 0.25, 0.2)],
  fireball: [tone('square', 800, 300, 0.1, 0.1)],
  brick: [tone('noise', 0, 0, 0.14, 0.18)],
  bump: [tone('triangle', 130, 80, 0.09, 0.25)],
  shrink: [tone('square', 700, 200, 0.4)],
  death: [
    tone('square', 500, 500, 0.12, 0.14),
    tone('square', 420, 420, 0.12, 0.14, 0.14),
    tone('square', 350, 350, 0.12, 0.14, 0.28),
    tone('square', 260, 120, 0.5, 0.14, 0.42),
  ],
  flag: arp([784, 988, 1175, 1568, 1976], 0.1, 0.12),
  gameover: [
    tone('triangle', 392, 392, 0.2, 0.2),
    tone('triangle', 330, 330, 0.2, 0.2, 0.22),
    tone('triangle', 262, 262, 0.2, 0.2, 0.44),
    tone('triangle', 196, 98, 0.6, 0.2, 0.66),
  ],
};

// An original four-bar loop in C major: [MIDI note or null for a rest, beats].
export const LEAD = [
  [76, 0.5], [79, 0.5], [81, 0.5], [79, 0.5], [76, 0.5], [74, 0.5], [72, 1],
  [74, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [69, 1],
  [72, 0.5], [76, 0.5], [79, 0.5], [84, 0.5], [81, 0.5], [79, 0.5], [76, 1],
  [74, 0.5], [72, 0.5], [74, 0.5], [76, 0.5], [72, 2],
];
export const BASS = [
  [48, 1], [55, 1], [48, 1], [55, 1],
  [45, 1], [52, 1], [45, 1], [52, 1],
  [41, 1], [48, 1], [41, 1], [48, 1],
  [43, 1], [50, 1], [48, 2],
];

function makeNoiseBuffer(ctx) {
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createAudio({ AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext, store = null } = {}) {
  const supported = typeof AudioContextClass === 'function';
  let muted = store ? store.get('muted', false) : false;
  let ctx = null;
  let master = null;
  let noise = null;
  let timer = null;
  let wantMusic = false;
  const lead = { i: 0, t: 0 };
  const bass = { i: 0, t: 0 };

  function playTone(start, { wave, from, to, dur, vol }) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    gain.connect(master);
    if (wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.connect(gain);
      src.start(start);
      src.stop(start + dur);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + dur);
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + dur);
  }

  function scheduleTrack(track, state, wave, vol) {
    while (state.t < ctx.currentTime + 0.4) {
      const [note, beats] = track[state.i];
      const dur = beats * BEAT;
      if (note !== null) {
        const f = noteFreq(note);
        playTone(state.t, { wave, from: f, to: f, dur: dur * 0.9, vol });
      }
      state.t += dur;
      state.i = (state.i + 1) % track.length;
    }
  }

  function stopTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function beginMusic() {
    stopTimer();
    lead.i = 0;
    bass.i = 0;
    lead.t = bass.t = ctx.currentTime + 0.05;
    const tick = () => {
      scheduleTrack(LEAD, lead, 'square', 0.05);
      scheduleTrack(BASS, bass, 'triangle', 0.1);
    };
    tick();
    timer = setInterval(tick, 100);
  }

  return {
    unlock() {
      if (!supported) return;
      if (!ctx) {
        try {
          ctx = new AudioContextClass();
          master = ctx.createGain();
          master.gain.value = muted ? 0 : MASTER_VOLUME;
          master.connect(ctx.destination);
          noise = makeNoiseBuffer(ctx);
        } catch {
          ctx = null;
          return;
        }
        if (wantMusic) beginMusic();
      }
      if (ctx.state === 'suspended') ctx.resume();
    },

    play(name) {
      if (!ctx || muted) return;
      const parts = SFX[name];
      if (!parts) return;
      const now = ctx.currentTime;
      for (const p of parts) playTone(now + p.delay, p);
    },

    startMusic() {
      wantMusic = true;
      if (ctx) beginMusic();
    },

    stopMusic() {
      wantMusic = false;
      stopTimer();
    },

    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
      if (store) store.set('muted', muted);
      return muted;
    },

    isMuted: () => muted,

    setSuspended(on) {
      if (!ctx) return;
      if (on) ctx.suspend();
      else ctx.resume();
    },
  };
}
