# Stick Control Practice App

React + Vite web app for practicing Stick Control-style snare exercises with a MusicXML-first workflow.

## Features

- Drum staff rendering with sticking labels (`R` / `L`) via VexFlow (SVG)
- Active-note highlighting as playback advances
- Time signature and measure timing imported from MusicXML
- Adjustable BPM (auto-seeded from MusicXML tempo when present)
- Metronome subdivisions:
  - Quarter notes
  - 8th notes
  - Triplets
  - 16th notes
  - 32nd notes
- Count-in bars before playback starts
- Repetition tracking (default: 20 reps per measure)
- Automatic next-measure popup after target reps
- MusicXML import (`.xml`, `.musicxml`)

## MusicXML expectations

- Sticking is read from:
  - `<notations><technical><hand>` when present (`right` / `left`)
  - `<lyric><text>` when it starts with `R` or `L`
- If sticking is missing on a note, the app alternates hands (`R/L`) as a fallback.
- Timing (beats, beat-type, note positions) is derived from the MusicXML measure data.
- The bundled default file is `public/stick-control-page-5.musicxml` (Stick Control page 5) and can be loaded from the UI.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Notation engine

This app uses [VexFlow](https://www.vexflow.com/) to engrave percussion notation as SVG in the browser.

## Build

```bash
npm run build
```

## Deploy to GitHub Pages

This repo now includes a GitHub Actions workflow at:

- `.github/workflows/deploy-pages.yml`

To enable hosting:

1. Open your repository settings on GitHub.
2. Go to **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually) to publish.

Expected URL after publish:

- https://drewchandler.github.io/stick_control/
