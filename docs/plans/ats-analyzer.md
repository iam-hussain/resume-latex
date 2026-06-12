# Implementation Plan — ATS Analyzer + JD Matching

> Status: **implemented** (Phases 1, 2 & AI assist) · Owner: Jakir · Target: 3 phases
>
> Shipped on branch `claude/ats-plan-ui-improvements-04i24r`:
> - Phase 1 — ATS Analyzer (`lib/ats/`, `/api/ats`, tabbed panel, report UI).
> - Phase 1.5 — compile cache + LaTeX error surfacing (`lib/latex.ts`).
> - Phase 2 — skills dictionary + JD matching + JD UI.
> - Phase 3 — AI Assist, generalized to a **multi-provider, configurable model**
>   layer (OpenAI + Anthropic + OpenRouter; keys via server env).
>
> Notable deviation from the original plan: extraction degrades gracefully.
> When no LaTeX toolchain is available it analyzes the `.tex` source instead of
> requiring a compiled PDF, so the feature works in any environment. pdfjs PDF
> extraction is used as the higher-fidelity backend when `latexmk` is present.
> Turns the TeX resume builder from "Overleaf clone" into a tool that shows you
> what an Applicant Tracking System actually parses from your PDF, and how well
> it matches a given job description.

---

## 1. Goal & scope

**Problem.** The app compiles `.tex` → PDF beautifully, but gives zero insight
into how a resume performs against ATS parsers — the thing that actually decides
whether a human ever sees it. We did all of this by hand this session
(`pdftotext`-style extraction, keyword density, page-count, glued-word
detection). This feature productizes that.

**In scope**
- Phase 1 — **ATS Analyzer**: compile → extract text the way an ATS sees it →
  report (sections, contact, page count, parse-quality warnings, keyword density).
- Phase 2 — **JD Matching**: paste a job description → keyword gap + match score.
- Phase 3 — **AI Assist** (stretch): Claude-backed bullet rewrite / keyword
  suggestions / "tailor to this JD".

**Out of scope (for now)**
- DOCX export, multi-user accounts, persistence beyond the filesystem,
  authentication. (Tracked separately.)

---

## 2. Architecture decisions

### D1 — Extraction engine: `pdfjs-dist` (pure JS)
- **Why:** no system dependency (poppler's `pdftotext` is *not installed* here),
  works on Node 22, and `getTextContent()` returns item-level text **with x/y
  positions** — which lets us (a) reconstruct ATS reading order, (b) detect
  glued words at font boundaries, (c) get exact page count. The position data is
  a feature: it's how we simulate "what the ATS sees" rather than what the eye sees.
- **Alternative rejected:** poppler `pdftotext -layout` is the most ATS-accurate
  but adds a system binary the deploy must carry. Document it as an optional
  higher-fidelity backend behind the same interface.
- **Note:** our resumes already set `\pdfinterwordspaceon`, so extraction is
  clean — the analyzer will *verify* that invariant rather than depend on it.

### D2 — Compile once, reuse everywhere (also fixes the perf gap)
Today `/api/preview` and `/api/pdf` each spawn `latexmk` independently
(`lib/latex.ts:74`). Adding a 3rd independent compile for ATS would mean three
full compiles per edit. Instead:
- Add an in-memory **LRU compile cache** in `lib/latex.ts`, keyed by
  `sha256(tex)` → `Buffer`. `buildPdfFromString` becomes a cache-aware wrapper.
- Preview, PDF download, and ATS all hit the same cached PDF for identical TeX.
- Side benefit: resolves Tier-2 "preview recompiles on every keystroke".

### D3 — Analysis is pure + server-side extraction
- Extraction (`pdfjs`) must run server-side (needs PDF bytes). Lives in
  `lib/ats/extract.ts`.
- Analysis (sections, contact, keywords, JD match) is **pure functions** with no
  I/O → `lib/ats/analyze.ts`, unit-testable in isolation, returns a typed JSON
  report. Client only renders.

### D4 — UI: tabbed right panel, not a third column
Three side-by-side columns would crush readability at laptop widths. Keep
**editor left**, make the **right panel tabbed**: `Preview | ATS Report`. The ATS
tab holds the report + a JD textarea. Reuses the existing `ResizablePanels`.

### D5 — JD matching is deterministic in Phase 2
Local tokenization + a curated skills dictionary (canonical + aliases). No LLM
call on the hot path → fast, free, offline. AI extraction is Phase 3 and additive.

---

## 3. Data model (`types/ats.ts`)

```ts
export interface AtsReport {
  pageCount: number
  overBudget: boolean              // pageCount > targetPages
  targetPages: number              // default 2
  extractedText: string            // full ATS-order text
  perPageText: string[]
  sections: {
    detected: string[]             // matched canonical headings
    missing: string[]              // expected-but-absent (Summary, Experience, Skills, Education)
  }
  contact: {
    email: string | null
    phone: string | null
    links: string[]                // urls / linkedin / github
    locationFound: boolean
  }
  keywords: KeywordStat[]          // { term, count } sorted desc
  warnings: AtsWarning[]           // glued words, missing section, overflow, no-email...
  parseQuality: number             // 0–100 composite score
}

export interface KeywordStat { term: string; count: number }
export interface AtsWarning {
  level: 'error' | 'warn' | 'info'
  code: string                     // 'GLUED_WORDS' | 'MISSING_SECTION' | 'PAGE_OVERFLOW' | ...
  message: string
  detail?: string
}

// Phase 2
export interface JdMatch {
  score: number                    // 0–100
  matched: { term: string; jdCount: number; resumeCount: number }[]
  missing: { term: string; jdCount: number }[]   // in JD, absent from resume — the gap
}
```

---

## 4. Phase 1 — ATS Analyzer

### 4.1 Backend

**`lib/latex.ts` — add compile cache**
- `compilePdf(tex): Promise<{ buffer: Buffer; cached: boolean }>` with an LRU
  (cap ~16 entries) keyed by `sha256(tex)`. `buildPdfFromString` delegates to it.
- Pure addition; existing callers unaffected.

**`lib/ats/extract.ts` — new**
- `extractPdf(buffer): Promise<{ pageCount; perPageText; text }>` using
  `pdfjs-dist` legacy build (`pdfjs-dist/legacy/build/pdf.mjs`) — the Node-safe
  entry. Disable worker (`useWorkerFetch:false`, no `GlobalWorkerOptions.workerSrc`).
- Reconstruct lines by grouping text items per `transform[5]` (y), sort by `[4]`
  (x); join items, inserting a space when the x-gap between items exceeds a
  threshold → this is also the **glued-word detector** signal.

**`lib/ats/analyze.ts` — new (pure)**
- `analyze(extracted, opts): AtsReport`. Composes:
  - `detectSections(text)` — case-insensitive match against canonical headings
    set; report detected + missing-but-expected.
  - `detectContact(text)` — email/phone/url regexes (port the ones from this
    session); `locationFound` via a light city/country heuristic.
  - `keywordStats(text)` — tokenize, drop stopwords, keep tech terms + known
    aliases, count, sort.
  - `qualityWarnings(...)` — GLUED_WORDS (non-brand camelCase joins, with the
    brand allowlist we built: StateGraph, GitHub, LangChain, OpenShift, …),
    MISSING_SECTION, PAGE_OVERFLOW, NO_EMAIL, NO_PHONE.
  - `parseQuality` — composite 0–100 from warning weights.

**`app/api/ats/route.ts` — new**
- `POST { tex, targetPages? }` → `compilePdf` → `extractPdf` → `analyze` →
  `NextResponse.json(report)`. Reuse `parseTexBody`; add optional `targetPages`.
- On compile failure, return `{ error, log }` (see §6 error surfacing) at 422.

### 4.2 Frontend

**`hooks/use-ats-report.ts` — new**
- `useAtsReport(tex, { targetPages })` — debounced (reuse `DEBOUNCE_MS`), calls
  `/api/ats`, returns `{ report, status, error }`. Mirrors `use-preview.ts`,
  skips empty TeX, cancels stale responses.

**`components/ats/ats-report.tsx` — new**
- Renders: page-count badge (red if `overBudget`), section checklist (✓/✗),
  contact card, warnings list (severity-colored), keyword-density table, parse-
  quality meter. A "What the ATS sees" `<details>` showing `extractedText`
  verbatim.

**`components/preview/preview-tabs.tsx` — new (thin)**
- Tab strip `Preview | ATS Report`. Lazy: only mount the ATS tab's hook when the
  tab is active (avoid a compile when the user never opens it).

**`components/layout/dashboard-shell.tsx` — wire in**
- Replace the `right={<PdfPreview .../>}` with `right={<PreviewTabs .../>}`
  holding both `PdfPreview` and `AtsReport`. Pass `texContent`.

### 4.3 Deliverable
Open the app → ATS Report tab shows live, per-edit: page count + overflow flag,
detected/missing sections, parsed contact, parse-quality warnings, keyword
density, and the raw ATS text. No JD yet.

---

## 5. Phase 2 — JD Matching

**`lib/ats/skills-dictionary.ts` — new**
- Curated canonical terms + alias map (e.g. `node` → `["node.js","nodejs","node"]`,
  `rag` → `["retrieval-augmented generation","rag"]`). Seed from our resume
  Skills sidebars so it's already domain-tuned.

**`lib/ats/jd-match.ts` — new (pure)**
- `matchJd(resumeText, jdText, dict): JdMatch`:
  - Tokenize JD → candidate terms (1–3-gram), stopword-filtered, alias-normalized.
  - Weight by JD frequency; matched if the canonical term appears in resume text.
  - `score = round(100 * Σ weight(matched) / Σ weight(all))`.
  - `missing` = JD terms absent from resume, sorted by JD frequency = the gap list.

**API + UI**
- Extend `/api/ats` to accept optional `jobDescription`; when present, include
  `jdMatch` in the report.
- ATS tab gains a collapsible **JD textarea** + a **match-score ring** and two
  columns: *Matched* / *Missing (add these)*. Clicking a missing term copies it.

### Deliverable
Paste a JD → live match score + a ranked list of missing keywords to add.

---

## 6. Cross-cutting: real compile-error surfacing (folded in)
While touching `lib/latex.ts`, capture `latexmk` stderr + the `.log` file and
parse `file-line-error` lines (`-file-line-error` is already in the Makefile;
add it to the spawn args in `execLatexmk`). Return `{ error, log, line? }` so
preview, PDF, and ATS routes can all show *what* broke and *where*. This is the
Tier-2 pain point and is nearly free once we're in this file.

---

## 7. File-change map

| Action | Path |
|---|---|
| add | `types/ats.ts` |
| add | `lib/ats/extract.ts` |
| add | `lib/ats/analyze.ts` |
| add | `lib/ats/skills-dictionary.ts` (P2) |
| add | `lib/ats/jd-match.ts` (P2) |
| add | `app/api/ats/route.ts` |
| add | `hooks/use-ats-report.ts` |
| add | `components/ats/ats-report.tsx` |
| add | `components/preview/preview-tabs.tsx` |
| edit | `lib/latex.ts` (cache + error capture) |
| edit | `components/layout/dashboard-shell.tsx` (tabs) |
| edit | `lib/api.ts` (`postAts`) |
| edit | `app/api/_shared/parse-tex-body.ts` (optional `targetPages`,`jobDescription`) |
| add | `package.json` dep: `pdfjs-dist` (P3 only: `@anthropic-ai/sdk`) |
| add | `lib/ats/*.test.ts` (analyze + jd-match unit tests) |

---

## 8. Edge cases & risks

- **Compile fails** → ATS report can't run; surface the LaTeX error (see §6), don't
  crash the panel.
- **pdfjs in Next server runtime** → must use the `legacy` build and disable the
  worker; verify it bundles under the App Router (Node runtime, not Edge — set
  `export const runtime = 'nodejs'` on the route).
- **Two-column resumes** (ours use `paracol`) → confirm extraction yields
  left-column-then-right order (we verified this manually with pypdf this session;
  re-verify with pdfjs and add a regression test using the real `ai-engineer.tex`).
- **Keyword false positives** → maintain the brand-allowlist so camelCase brands
  aren't flagged as glued words.
- **Cache staleness** → keyed by exact tex hash, so never stale; LRU cap bounds memory.
- **Perf** → ATS adds extraction (~50–150ms) on top of a (now cached) compile.
  Only runs when the ATS tab is open.

---

## 9. Testing

- Unit (Vitest — add as devDep; project has none yet): `analyze.ts`,
  `jd-match.ts`, `detectContact`, glued-word detector — table-driven.
- Integration: `extractPdf` against a committed fixture PDF compiled from
  `ai-engineer.tex`; assert page count = 2, sections detected, email parsed,
  zero non-brand glued words (locks in the `\pdfinterwordspaceon` win).
- Manual: open each of the 3 variants, confirm report + JD match render.

---

## 10. Phasing & estimate

| Phase | Scope | Est. |
|---|---|---|
| **1** | Compile cache + extract + analyze + `/api/ats` + tabbed panel + report UI | ~1–1.5 days |
| **1.5** | Error surfacing in `lib/latex.ts` (folded in) | ~0.5 day |
| **2** | Skills dict + JD match + JD UI | ~1 day |
| **3** | Claude assist (rewrite/suggest/tailor), streaming | ~1.5–2 days |

**Recommended first PR:** Phase 1 only (analyzer, no JD) — self-contained, ships
the differentiating value, and de-risks the pdfjs/runtime questions before
building JD matching on top.
