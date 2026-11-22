// Tiny WebAudio sound effects, synthesised in code — no audio files, no
// network. The context is created lazily on the first user gesture, so a
// headless screenshot run never errors, and every call is guarded.
let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function audio() {
  if (muted) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, start, duration, type = 'sine', volume = 0.12) {
  const ac = audio();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ac.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime + start);
    osc.stop(ac.currentTime + start + duration + 0.02);
  } catch {
    // Sound is garnish: never let it break the game.
  }
}

export const SFX = {
  pickup() {
    tone(660, 0, 0.09);
    tone(990, 0.07, 0.14);
  },
  objective() {
    tone(523, 0, 0.12);
    tone(659, 0.1, 0.12);
    tone(784, 0.2, 0.2);
  },
  alert() {
    tone(220, 0, 0.18, 'sawtooth', 0.08);
    tone(185, 0.16, 0.22, 'sawtooth', 0.08);
  },
  zap() {
    tone(1400, 0, 0.06, 'square', 0.06);
    tone(300, 0.05, 0.12, 'square', 0.06);
  },
  loop() {
    tone(880, 0, 0.1, 'triangle');
    tone(1174, 0.09, 0.16, 'triangle');
  },
  lockdown() {
    tone(440, 0, 0.25, 'sawtooth', 0.09);
    tone(440, 0.3, 0.25, 'sawtooth', 0.09);
    tone(440, 0.6, 0.4, 'sawtooth', 0.09);
  },
  caught() {
    tone(392, 0, 0.2, 'triangle');
    tone(311, 0.18, 0.2, 'triangle');
    tone(233, 0.36, 0.4, 'triangle');
  },
  getaway() {
    tone(523, 0, 0.15);
    tone(659, 0.12, 0.15);
    tone(784, 0.24, 0.15);
    tone(1046, 0.36, 0.35);
  },
  click() {
    tone(700, 0, 0.05, 'triangle', 0.06);
  },
};
