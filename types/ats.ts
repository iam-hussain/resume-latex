// Types for the ATS Analyzer + JD Matching feature.
// See docs/plans/ats-analyzer.md for the design rationale.

export interface KeywordStat {
  term: string
  count: number
}

export type AtsWarningLevel = 'error' | 'warn' | 'info'

export type AtsWarningCode =
  | 'GLUED_WORDS'
  | 'MISSING_SECTION'
  | 'PAGE_OVERFLOW'
  | 'NO_EMAIL'
  | 'NO_PHONE'
  | 'NO_LINKS'
  | 'SHORT_RESUME'
  | 'LONG_BULLETS'
  | 'FEW_ACTION_VERBS'
  | 'NO_METRICS'

export interface AtsWarning {
  level: AtsWarningLevel
  code: AtsWarningCode
  message: string
  detail?: string
}

export interface AtsSections {
  detected: string[]
  missing: string[]
}

export interface AtsContact {
  email: string | null
  phone: string | null
  links: string[]
  locationFound: boolean
}

// Phase 2 — JD matching
export interface JdMatchedTerm {
  term: string
  jdCount: number
  resumeCount: number
}

export interface JdMissingTerm {
  term: string
  jdCount: number
}

export interface JdMatch {
  score: number
  matched: JdMatchedTerm[]
  missing: JdMissingTerm[]
}

export interface AtsReport {
  // How the text was obtained: a compiled PDF (ATS-accurate) or the raw .tex
  // source (fallback when no LaTeX toolchain is available).
  source: 'pdf' | 'tex'
  pageCount: number | null
  overBudget: boolean
  targetPages: number
  wordCount: number
  extractedText: string
  perPageText: string[]
  sections: AtsSections
  contact: AtsContact
  keywords: KeywordStat[]
  warnings: AtsWarning[]
  parseQuality: number // 0–100 composite score
  jdMatch?: JdMatch
}

export interface AtsRequestOptions {
  targetPages?: number
  jobDescription?: string
}

export type AtsStatus = 'idle' | 'loading' | 'success' | 'error'
