import { noteName } from './dsp.js';

const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '–');

// Turns a summary into table rows + plain-language advice. Thresholds are heuristics to tune against real data.
export function buildReport(s) {
  if (!s.frames || s.voicedRatio < 0.05) return { rows: [], advice: ['No clear voice detected. Move closer to the microphone, reduce background noise, and sing a sustained vowel.'] };
  const rows = [
    ['Mean pitch', `${fmt(s.meanF0)} Hz (${noteName(69 + 12 * Math.log2(s.meanF0 / 440))})`, 'Average fundamental frequency'],
    ['Range', `${noteName(s.lowMidi)} to ${noteName(s.highMidi)}`, 'Lowest and highest voiced note'],
    ['Intonation error', `${fmt(s.meanAbsCents)} cents`, 'Average distance from the nearest note'],
    ['Jitter (approx.)', `${fmt(s.jitter, 2)} %`, 'Pitch wobble between frames'],
    ['Shimmer (approx.)', `${fmt(s.shimmer, 2)} dB`, 'Loudness wobble between frames'],
    ['HNR', `${fmt(s.hnr)} dB`, 'Harmonic strength vs. noise'],
    ['Voiced time', `${fmt(s.voicedRatio * 100, 0)} %`, 'Share of audio with a detected pitch'],
  ];
  const advice = [];
  if (s.meanAbsCents > 30) advice.push('Pitch sits noticeably between notes. Try slower, sustained notes and match a reference tone.');
  else if (s.meanAbsCents < 15) advice.push('Intonation is close to the nearest notes. Good pitch centring.');
  else advice.push('Intonation is moderate. Check the trace for drift on long notes.');
  if (s.jitter > 2) advice.push('High pitch instability. Work on steady breath support and avoid pushing on sustained notes.');
  if (s.shimmer > 1.5) advice.push('Volume fluctuates a lot. Aim for even airflow across each note.');
  if (s.hnr < 10) advice.push('Low HNR suggests breathiness or noise. Check mic placement and room noise, then try again.');
  else if (s.hnr > 18) advice.push('High HNR: the tone is clear and harmonically rich.');
  return { rows, advice };
}
