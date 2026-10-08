export type Cue = 'place-x' | 'place-o' | 'invalid' | 'win' | 'lose' | 'draw' | 'click';

interface Tone {
  freq: number;
  start: number;
  dur: number;
  type: OscillatorType;
  gain: number;
}

const CUES: Record<Cue, Tone[]> = {
  'place-x': [{ freq: 520, start: 0, dur: 0.09, type: 'triangle', gain: 0.12 }],
  'place-o': [{ freq: 390, start: 0, dur: 0.09, type: 'triangle', gain: 0.12 }],
  invalid: [{ freq: 150, start: 0, dur: 0.14, type: 'square', gain: 0.06 }],
  click: [{ freq: 700, start: 0, dur: 0.04, type: 'sine', gain: 0.07 }],
  win: [
    { freq: 523, start: 0, dur: 0.14, type: 'triangle', gain: 0.14 },
    { freq: 659, start: 0.13, dur: 0.14, type: 'triangle', gain: 0.14 },
    { freq: 784, start: 0.26, dur: 0.32, type: 'triangle', gain: 0.14 },
  ],
  lose: [
    { freq: 330, start: 0, dur: 0.18, type: 'sawtooth', gain: 0.07 },
    { freq: 247, start: 0.17, dur: 0.34, type: 'sawtooth', gain: 0.07 },
  ],
  draw: [
    { freq: 440, start: 0, dur: 0.15, type: 'sine', gain: 0.1 },
    { freq: 440, start: 0.18, dur: 0.2, type: 'sine', gain: 0.1 },
  ],
};

let context: AudioContext | null = null;

/** Plays a short synthesized cue. Never throws (audio may be blocked or unsupported). */
export function playCue(cue: Cue): void {
  try {
    const Ctor: typeof AudioContext | undefined =
      globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    for (const tone of CUES[cue]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = tone.type;
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, now + tone.start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur);
      osc.connect(gain).connect(context.destination);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.dur + 0.03);
    }
  } catch {
    // ignore: sound is optional
  }
}
