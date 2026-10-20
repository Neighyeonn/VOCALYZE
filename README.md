# Vocalyze

Web-based vocal diagnostics using Digital Signal Processing. First prototype: foundation only (no computer vision yet).

## What works now
- Live microphone analysis (Web Audio API) and audio file upload
- YIN pitch tracking (octave-error resistant), note name, cents deviation
- Approximate jitter, shimmer, and HNR
- Scrolling pitch trace and a plain-language report

## Run
Microphone access needs `localhost` or HTTPS. No build step:

```
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure
```
index.html      UI
css/style.css   Styles (light/dark)
js/dsp.js       Pure DSP: YIN, HNR, jitter, shimmer, summary
js/report.js    Metrics -> table + advice (thresholds are placeholders to tune)
js/app.js       Mic/file input, live display, trace canvas
```

## Known gaps / roadmap
1. **Latency:** live path uses a 2048-sample window on the main thread (about 43 ms at 48 kHz), so the ≤ 20 ms target is not met. Move to an AudioWorklet with smaller frames (or WASM) and measure end-to-end.
2. **Jitter/shimmer** are frame-level approximations. Replace with cycle-by-cycle period detection to match Praat-style values.
3. **Formants / resonance:** not implemented (planned: LPC-based formant tracking).
4. **Benchmarking:** compare against CREPE and autocorrelation (e.g. on MIR-1K or similar datasets); add unit tests for `dsp.js` using synthetic tones.
5. **Report thresholds** are heuristics, not validated norms.
6. Per-session history, coach dashboard, MediaPipe facial tracking (later phase).

For education and training only. Not a medical diagnostic tool.
