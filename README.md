# Node.js + LaTeX Resume Project

This repository includes:
- A **Real-Time TeX Resume Builder** (Next.js) with dual-pane editor and live preview.
- A minimal Node.js (TypeScript) Express server (optional; see `npm run dev:express`).
- The original LaTeX resume sources (e.g. `full_stack_ai.tex`, `front_end.tex`).

## TeX Resume Builder (Next.js)

- **Prereqs**: Node.js ≥ 18; for PDF download, `latexmk`/TeX on PATH.
- **Install**: `npm install`
- **Dev**: `npm run dev` — opens the builder at http://localhost:3000
- **Build**: `npm run build` then `npm start`

Features:
- Dual-pane UI: Monaco editor (left) and live preview (right) with resizable panels.
- Debounced preview: edits trigger HTML preview via `/api/preview` (latex.js).
- Download PDF: "Download PDF" uses `/api/pdf` (latexmk/pdflatex) for high-quality output.
- Default template: `templates/default.tex`; customize in `templates/`.

API:
- `POST /api/preview` — body `{ "tex": "..." }` → HTML preview.
- `POST /api/pdf` — body `{ "tex": "..." }` → PDF attachment.

## Legacy Express app

- **Dev**: `npm run dev:express` (runs Express on port 3000; use a different port if Next.js is running).
- **Build**: `npm run build:express`
- Health: `GET http://localhost:3000/health`
- Render from file: `GET http://localhost:3000/html?src=...`, `/xml?src=...`, `/pdf?src=...`

## LaTeX build
- Prereqs: MacTeX or TeX Live with `latexmk` in `PATH`.
- `make pdf` — compiles to `build/full_stack_ai.pdf`.
- `make watch` — continuously rebuilds on changes.
- `make clean` — removes generated artifacts.

## Assets
- Image references live under `vertopal_6922ea475a454e5cb44818d3445113ac/media/`.
- Placeholder PNGs are provided so the document compiles; replace with real assets to restore the intended layout.

## Notes
- Build outputs (Node dist, LaTeX build artifacts) are ignored via `.gitignore`. Commit only source files and real assets.

