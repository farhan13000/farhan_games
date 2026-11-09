import { usePrefsStore } from '../store/prefsStore';

type SoundName = 'placeX' | 'placeO' | 'win' | 'lose' | 'draw' | 'join' | 'error' | 'turn';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  amp.gain.setValueAtTime(0.0001, ac.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

const SOUNDS: Record<SoundName, () => void> = {
  placeX: () => tone(520, 0, 0.12, 'triangle'),
  placeO: () => tone(390, 0, 0.12, 'triangle'),
  turn: () => tone(660, 0, 0.08, 'sine', 0.04),
  join: () => {
    tone(440, 0, 0.12);
    tone(660, 0.1, 0.16);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle')),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.12, 0.25, 'sine', 0.06)),
  draw: () => {
    tone(440, 0, 0.18);
    tone(440, 0.2, 0.18);
  },
  error: () => tone(160, 0, 0.18, 'square', 0.03),
};

/** Tiny synthesized sound effects (no audio assets). Respects the mute preference. */
export function playSound(name: SoundName): void {
  if (!usePrefsStore.getState().soundOn) return;
  try {
    SOUNDS[name]();
  } catch {
    /* audio not available */
  }
}
