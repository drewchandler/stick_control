# AGENTS.md

## Cursor Cloud specific instructions

This is a **frontend-only** React + Vite single-page app (no backend, no database, no env vars).

### Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Preview build | `npm run preview` |

- The dev server runs on port **5173** by default. Use `npm run dev -- --host 0.0.0.0` to expose it for browser testing.
- ESLint is the only linter; there are no automated tests (no test framework configured).
- The app loads a bundled MusicXML file from `public/stick-control-page-5.musicxml` on startup — no network services required.
- VexFlow renders notation as SVG; verify UI changes visually in the browser.
