# Vocalyze

Web-based vocal diagnostics using Digital Signal Processing (DSP). This is the first prototype: the foundation only, with no computer vision yet.

Everything runs in the browser in plain JavaScript, HTML and CSS. There is no backend, no build step and nothing to install except a way to serve the files.

## Features
- Live microphone analysis (Web Audio API) and audio file upload
- YIN pitch tracking, note name, frequency and cents deviation
- Approximate jitter, shimmer and Harmonics-to-Noise Ratio (HNR)
- Scrolling pitch trace and a plain-language report

## Requirements
- A modern desktop browser: Chrome, Edge, Firefox or Safari (current versions)
- A microphone (for live mode)
- One way to serve static files (see below)

## How to run

The app uses ES modules and the microphone, so it must be served over `http://localhost` or HTTPS. Opening `index.html` by double-clicking (`file://`) will not work.

1. Download or clone the repository and open a terminal in the project folder (the one containing `index.html`).
2. Start a local server using **one** of these options:

   **Option A: Python 3** (if you already have it)
   ```
   python3 -m http.server 8000
   ```
   On Windows, use `python -m http.server 8000` or `py -m http.server 8000`.

   **Option B: Node.js**
   ```
   npx serve -l 8000
   ```

   **Option C: VS Code**
   Install the "Live Server" extension, then right-click `index.html` and choose "Open with Live Server".

3. Open **http://localhost:8000** in your browser (Live Server shows its own address).

## How to use
**Live mode**
1. Click **Start microphone** and allow access when the browser asks.
2. Sing or hum a sustained note. You will see the note name, frequency, cents meter and the scrolling pitch trace.
3. Click **Stop and see report** to get the session summary and advice.

**File mode**
1. Click **Analyze a file** and choose a recording (WAV, MP3, M4A or anything your browser can decode).
2. Wait for the progress to finish. The full pitch trace and report will appear.

## Tips for good results
- Use headphones if you play a reference tone, so it does not leak into the microphone.
- Record in a quiet room and stay close to the microphone. Noise and echo lower the HNR and can break pitch tracking.
- Sing single notes or a monophonic melody. The tracker follows one voice at a time.
- The app turns off the browser's echo cancellation, noise suppression and auto gain on purpose, because they distort the measurements.

## Troubleshooting
| Problem | Fix |
|---|---|
| Blank page or console error about modules | You opened the file directly. Serve it with one of the options above. |
| "Microphone blocked" message | Allow microphone access in the browser's site settings, then reload. Use `localhost` or HTTPS only. |
| No pitch detected | Sing louder or closer to the mic, reduce background noise, try a sustained vowel such as "ah". |
| File will not load | Convert it to WAV or MP3. Some codecs are not decodable in every browser. |
| Port 8000 already in use | Use another port, for example `python3 -m http.server 8080`. |

## Project structure
```
index.html      UI
css/style.css   Styles (light and dark)
js/dsp.js       Pure DSP: YIN, HNR, jitter, shimmer, summary
js/report.js    Metrics to table and advice (thresholds are placeholders)
js/app.js       Mic and file input, live display, pitch trace
```

## Known limitations
1. **Latency:** the live path uses a 2048-sample window on the main thread (about 43 ms at 48 kHz). The 20 ms target is not met yet. Planned fix: AudioWorklet with smaller frames.
2. **Jitter and shimmer** are frame-level approximations, not cycle-level values like Praat. Do not treat them as clinical measurements.
3. **Formants and resonance** are not implemented yet.
4. **Benchmarking** against CREPE and autocorrelation methods has not been done yet.
5. **Report thresholds** are heuristics, not validated norms.

## Roadmap
- AudioWorklet or WASM pipeline for low-latency live analysis
- Cycle-level jitter and shimmer
- LPC-based formant tracking
- Unit tests for `dsp.js` with synthetic tones
- Benchmark suite against CREPE, pYIN and Praat
- Session history and coach dashboard
- MediaPipe facial tracking (later phase)

## Disclaimer
Vocalyze is for education and training only. It is not a substitute for evaluation by a licensed otolaryngologist.
