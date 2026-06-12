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
- Dual-pane UI: Monaco editor (left) and a **tabbed right panel** (`Preview · ATS Report · AI Assist`) with resizable panels.
- Debounced preview: edits trigger HTML preview via `/api/preview` (latex.js).
- Download PDF: "Download PDF" uses `/api/pdf` (latexmk/pdflatex) for high-quality output.
- Light / dark theme toggle (persisted).
- Default template: `templates/default.tex`; customize in `templates/`.

### ATS Analyzer (`ATS Report` tab)
Shows what an Applicant Tracking System actually parses from your resume:
parse-quality score, detected/missing sections, parsed contact, keyword density,
and quality warnings (glued words, missing email, no metrics, …). Paste a job
description to get a **match score** and a ranked list of missing keywords.

- When a LaTeX toolchain (`latexmk`) is present, the analyzer extracts text from
  the **compiled PDF** via `pdfjs-dist` — the most ATS-accurate reading (exact
  page count, glued-word detection).
- When no toolchain is available, it **falls back to the `.tex` source** so the
  report always works (page count is then estimated).

### AI Assist (`AI Assist` tab)
A model-powered resume coach embedded in the UI: "Optimize for ATS", "Tailor to
JD", "Improve bullets", "Write summary", plus freeform chat. The model sees your
current LaTeX source and ATS context and replies with concrete, paste-ready edits.

- **Configurable model**: pick the provider and model from a dropdown.
- **Providers**: OpenAI (GPT), Anthropic (Claude), and OpenRouter (Llama, Gemini,
  Mistral, …). Keys are read from server env vars — see `.env.example`. A provider
  only appears in the selector when its key is set; with no keys the tab shows a
  setup hint.

```bash
cp .env.example .env.local   # then fill in any of:
# ANTHROPIC_API_KEY / OPENAI_API_KEY / OPENROUTER_API_KEY
```

API:
- `POST /api/preview` — body `{ "tex": "..." }` → HTML preview.
- `POST /api/pdf` — body `{ "tex": "..." }` → PDF attachment.
- `POST /api/ats` — body `{ "tex", "targetPages?", "jobDescription?" }` → ATS report JSON.
- `GET  /api/ai/models` — which providers/models are available (no keys leaked).
- `POST /api/ai` — body `{ provider, model, action, tex, message?, jobDescription?, history? }` → streamed text.

### Tests
- `npm test` — Vitest unit tests for the ATS analyzer and JD matcher (`lib/ats/*.test.ts`).

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

