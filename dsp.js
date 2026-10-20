// Core DSP. Pure functions, no DOM, so they can be unit-tested or moved into an AudioWorklet/WASM later.

export function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

// YIN pitch estimator (de Cheveigné & Kawahara, 2002). Cumulative mean normalisation + first-dip
// threshold + parabolic interpolation is what suppresses octave (halving/doubling) errors.
export function yin(buf, sr, { fMin = 70, fMax = 1000, thr = 0.15 } = {}) {
  const W = buf.length >> 1;
  const tMax = Math.min(W - 2, Math.floor(sr / fMin));
  const tMin = Math.max(2, Math.floor(sr / fMax));
  const c = new Float32Array(tMax + 2);
  c[0] = 1;
  let run = 0;
  for (let t = 1; t <= tMax + 1; t++) {
    let d = 0;
    for (let j = 0; j < W; j++) { const x = buf[j] - buf[j + t]; d += x * x; }
    run += d;
    c[t] = run > 0 ? (d * t) / run : 1;
  }
  let tau = -1;
  for (let t = tMin; t <= tMax; t++) {
    if (c[t] < thr) { while (t + 1 <= tMax && c[t + 1] < c[t]) t++; tau = t; break; }
  }
  if (tau < 0) { // no dip under threshold: fall back to global minimum
    let best = Infinity;
    for (let t = tMin; t <= tMax; t++) if (c[t] < best) { best = c[t]; tau = t; }
  }
  const a = c[tau - 1], b = c[tau], d2 = c[tau + 1];
  const den = a - 2 * b + d2;
  const shift = den ? (0.5 * (a - d2)) / den : 0;
  return { f0: sr / (tau + shift), clarity: Math.max(0, Math.min(1, 1 - b)) };
}

// Analyse one frame -> {voiced, f0, midi, cents, rms, clarity, hnr}
export function analyzeFrame(buf, sr, { rmsGate = 0.008, minClarity = 0.6 } = {}) {
  const r = rms(buf);
  if (r < rmsGate) return { voiced: false, rms: r };
  const { f0, clarity } = yin(buf, sr);
  if (clarity < minClarity) return { voiced: false, rms: r };
  const cl = Math.min(0.9999, Math.max(0.0001, clarity));
  const hnr = 10 * Math.log10(cl / (1 - cl)); // HNR estimate from normalised autocorrelation peak
  const midi = 69 + 12 * Math.log2(f0 / 440);
  const cents = (midi - Math.round(midi)) * 100;
  return { voiced: true, f0, midi, cents, rms: r, clarity, hnr };
}

// Maps a 0..1 sensitivity slider to detection thresholds.
// 0 = strict (loud, clearly pitched sounds only), 1 = sensitive (quiet and noisy sounds too).
export function sensitivityToOpts(s) {
  return { rmsGate: 0.05 * Math.pow(0.002 / 0.05, s), minClarity: 0.85 - 0.45 * s };
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function noteName(midi) {
  const n = Math.round(midi);
  return NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
}

const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);

// frames: [{t, voiced, f0, midi, cents, rms, hnr}] in time order.
// NOTE: jitter/shimmer here are frame-level approximations (consecutive voiced frames),
// not cycle-level values like Praat. Upgrade path: cycle-synchronous period detection.
export function summarize(frames) {
  const v = frames.filter(f => f.voiced);
  const pairs = [];
  for (let i = 1; i < frames.length; i++) if (frames[i].voiced && frames[i - 1].voiced) pairs.push([frames[i - 1], frames[i]]);
  const periods = pairs.map(([a, b]) => [1 / a.f0, 1 / b.f0]);
  const jitter = pairs.length ? (mean(periods.map(([a, b]) => Math.abs(b - a))) / mean(periods.map(p => p[1]))) * 100 : NaN;
  const shimmer = pairs.length ? mean(pairs.map(([a, b]) => Math.abs(20 * Math.log10(b.rms / a.rms)))) : NaN;
  return {
    frames: frames.length,
    voicedRatio: frames.length ? v.length / frames.length : 0,
    meanF0: mean(v.map(f => f.f0)),
    lowMidi: v.length ? Math.min(...v.map(f => f.midi)) : NaN,
    highMidi: v.length ? Math.max(...v.map(f => f.midi)) : NaN,
    meanAbsCents: mean(v.map(f => Math.abs(f.cents))),
    jitter, shimmer,
    hnr: mean(v.map(f => f.hnr)),
  };
}
