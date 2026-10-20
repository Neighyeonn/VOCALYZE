import { analyzeFrame, summarize, noteName } from './dsp.js';
import { buildReport } from './report.js';

const $ = id => document.getElementById(id);
const WIN = 2048, HOP = 512;
let frames = [], ctx, stream, raf, running = false;

function showLive(f) {
  $('note').textContent = f.voiced ? noteName(f.midi) : '–';
  $('hz').textContent = f.voiced ? `${f.f0.toFixed(1)} Hz` : '– Hz';
  $('cents').textContent = f.voiced ? f.cents.toFixed(0) : '–';
  $('hnr').textContent = f.voiced ? f.hnr.toFixed(1) : '–';
  $('clar').textContent = f.voiced ? f.clarity.toFixed(2) : '–';
  $('needle').style.left = f.voiced ? `${50 + f.cents}%` : '50%';
}

function drawTrace(list, windowSec) {
  const c = $('trace'), g = c.getContext('2d'), W = c.width, H = c.height;
  const css = getComputedStyle(document.body);
  g.clearRect(0, 0, W, H);
  const v = list.filter(f => f.voiced);
  if (!v.length) return;
  const tEnd = list[list.length - 1].t, tStart = windowSec ? tEnd - windowSec : list[0].t;
  const vis = v.filter(f => f.t >= tStart);
  if (!vis.length) return;
  const lo = Math.floor(Math.min(...vis.map(f => f.midi))) - 1, hi = Math.ceil(Math.max(...vis.map(f => f.midi))) + 1;
  const X = t => ((t - tStart) / Math.max(0.001, tEnd - tStart)) * W, Y = m => H - ((m - lo) / (hi - lo)) * H;
  g.font = '12px system-ui'; g.fillStyle = css.getPropertyValue('--mute'); g.strokeStyle = css.getPropertyValue('--line');
  for (let m = lo; m <= hi; m++) { g.beginPath(); g.moveTo(0, Y(m)); g.lineTo(W, Y(m)); g.stroke(); g.fillText(noteName(m), 4, Y(m) - 3); }
  g.strokeStyle = css.getPropertyValue('--acc'); g.lineWidth = 2; g.beginPath();
  let prev = null;
  for (const f of vis) {
    const gap = prev && f.t - prev.t > 0.1;
    if (!prev || gap) g.moveTo(X(f.t), Y(f.midi)); else g.lineTo(X(f.t), Y(f.midi));
    prev = f;
  }
  g.stroke();
}

function showReport() {
  const { rows, advice } = buildReport(summarize(frames));
  $('metrics').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
  $('advice').innerHTML = advice.map(a => `<li>${a}</li>`).join('');
  $('report').hidden = false;
}

async function startMic() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) { $('status').textContent = 'Microphone blocked. Allow access in your browser and try again.'; return; }
  ctx = new AudioContext();
  const an = ctx.createAnalyser(); an.fftSize = WIN;
  ctx.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(WIN), t0 = ctx.currentTime;
  frames = []; running = true; $('report').hidden = true;
  $('micBtn').textContent = 'Stop and see report'; $('status').textContent = 'Listening…';
  (function loop() {
    if (!running) return;
    an.getFloatTimeDomainData(buf);
    const f = analyzeFrame(buf, ctx.sampleRate); f.t = ctx.currentTime - t0;
    frames.push(f); showLive(f); drawTrace(frames, 8);
    raf = requestAnimationFrame(loop);
  })();
}

function stopMic() {
  running = false; cancelAnimationFrame(raf);
  stream.getTracks().forEach(t => t.stop()); ctx.close();
  $('micBtn').textContent = 'Start microphone'; $('status').textContent = 'Done.';
  drawTrace(frames, 0); showReport();
}

async function analyzeFile(file) {
  if (running) stopMic();
  $('status').textContent = 'Decoding…'; $('report').hidden = true;
  const ac = new AudioContext();
  let audio;
  try { audio = await ac.decodeAudioData(await file.arrayBuffer()); }
  catch { $('status').textContent = 'Could not read that file. Try WAV, MP3 or M4A.'; return; }
  finally { ac.close(); }
  const data = audio.getChannelData(0), sr = audio.sampleRate;
  frames = [];
  for (let i = 0; i + WIN <= data.length; i += HOP) {
    const f = analyzeFrame(data.subarray(i, i + WIN), sr); f.t = i / sr; frames.push(f);
    if (frames.length % 100 === 0) { $('status').textContent = `Analyzing… ${Math.round((i / data.length) * 100)}%`; await new Promise(r => setTimeout(r)); }
  }
  $('status').textContent = `Analyzed ${audio.duration.toFixed(1)} s.`;
  showLive({ voiced: false }); drawTrace(frames, 0); showReport();
}

$('micBtn').onclick = () => (running ? stopMic() : startMic());
$('fileIn').onchange = e => e.target.files[0] && analyzeFile(e.target.files[0]);
