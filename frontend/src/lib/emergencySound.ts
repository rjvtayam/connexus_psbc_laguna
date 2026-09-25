const EMERGENCY_VOLUME = 0.22;
const SWEEP_CENTER_HZ = 775;
const SWEEP_DEPTH_HZ = 175;
const SWEEP_RATE_HZ = 0.7;
const PULSE_RATE_HZ = 2;

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!sharedCtx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      sharedCtx = new Ctor();
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

export function unlockEmergencyAudio(): void {
  getCtx();
}

export function startEmergencySiren(): () => void {
  const ctx = getCtx();
  if (!ctx) return () => {};

  const startAt = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, startAt);
  master.gain.linearRampToValueAtTime(EMERGENCY_VOLUME, startAt + 0.15);
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = SWEEP_CENTER_HZ;

  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = SWEEP_CENTER_HZ * 2;

  const osc2Gain = ctx.createGain();
  osc2Gain.gain.value = 0.25;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = SWEEP_RATE_HZ;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = SWEEP_DEPTH_HZ;
  lfo.connect(lfoDepth);
  lfoDepth.connect(osc.frequency);
  lfoDepth.connect(osc2.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 3200;
  filter.Q.value = 0.7;

  const pulse = ctx.createGain();
  pulse.gain.value = 0.85;
  const pulseLfo = ctx.createOscillator();
  pulseLfo.type = 'sine';
  pulseLfo.frequency.value = PULSE_RATE_HZ;
  const pulseDepth = ctx.createGain();
  pulseDepth.gain.value = 0.15;
  pulseLfo.connect(pulseDepth);
  pulseDepth.connect(pulse.gain);

  osc.connect(filter);
  osc2.connect(osc2Gain);
  osc2Gain.connect(filter);
  filter.connect(pulse);
  pulse.connect(master);

  osc.start(startAt);
  osc2.start(startAt);
  lfo.start(startAt);
  pulseLfo.start(startAt);

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    try {
      const t = ctx.currentTime;
      const current = master.gain.value;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(current, t);
      master.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.stop(t + 0.25);
      osc2.stop(t + 0.25);
      lfo.stop(t + 0.25);
      pulseLfo.stop(t + 0.25);
    } catch {
      /* context already closed */
    }
  };
}

export function startEmergencyVibration(): () => void {
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return () => {};
  try {
    nav.vibrate([400, 200, 400]);
  } catch {
    return () => {};
  }
  const interval = window.setInterval(() => {
    try {
      nav.vibrate!([400, 200, 400]);
    } catch {
      /* vibration unsupported */
    }
  }, 4000);
  return () => {
    window.clearInterval(interval);
    try {
      nav.vibrate!(0);
    } catch {
      /* ignore */
    }
  };
}
