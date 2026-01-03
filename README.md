# LaTeX Resume Project

This repository now includes a minimal LaTeX project scaffold for the existing resume source `full_stack_ai.tex`.

## Prerequisites
- A TeX distribution such as MacTeX or TeX Live (`latexmk` available in `PATH`).

## Build
- `make pdf` — compiles the resume to `build/full_stack_ai.pdf`.
- `make watch` — continuously rebuilds on changes.
- `make clean` — removes generated artifacts.

## Assets
- Image references are expected under `vertopal_6922ea475a454e5cb44818d3445113ac/media/`.
- Placeholder PNGs are provided so the document compiles; replace them with your real assets to restore the intended layout.

## Notes
- Build outputs are ignored via `.gitignore`. Commit only the `.tex` source and real assets.

