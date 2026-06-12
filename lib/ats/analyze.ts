// Pure analysis functions — no I/O. Given extracted resume text, produce a typed
// AtsReport. Unit-tested in isolation (see analyze.test.ts).

import type {
  AtsContact,
  AtsReport,
  AtsSections,
  AtsWarning,
  KeywordStat,
} from '@/types/ats'
import { BRAND_ALLOWLIST, SKILLS_DICTIONARY } from './skills-dictionary'

const CANONICAL_SECTIONS: Record<string, string[]> = {
  Summary: ['summary', 'objective', 'profile', 'about'],
  Experience: ['experience', 'employment', 'work history', 'professional experience'],
  Education: ['education', 'academic'],
  Skills: ['skills', 'technical skills', 'technologies', 'core competencies'],
  Projects: ['projects', 'personal projects', 'selected projects'],
  Certifications: ['certifications', 'certificates', 'licenses'],
}

const EXPECTED_SECTIONS = ['Summary', 'Experience', 'Skills', 'Education']

const ACTION_VERBS = [
  'led', 'built', 'designed', 'developed', 'created', 'implemented', 'launched',
  'shipped', 'architected', 'improved', 'increased', 'reduced', 'optimized',
  'migrated', 'automated', 'scaled', 'delivered', 'managed', 'drove', 'owned',
  'spearheaded', 'engineered', 'deployed', 'integrated', 'refactored',
]

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'was',
  'were', 'are', 'will', 'would', 'their', 'they', 'them', 'our', 'you', 'your',
  'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'as', 'is', 'it', 'or', 'be',
])

export function detectSections(text: string): AtsSections {
  const lower = text.toLowerCase()
  const detected: string[] = []
  for (const [canonical, variants] of Object.entries(CANONICAL_SECTIONS)) {
    if (variants.some((v) => new RegExp(`(^|\\n|\\s)${escapeRe(v)}(\\s|:|\\n|$)`, 'i').test(lower))) {
      detected.push(canonical)
    }
  }
  const missing = EXPECTED_SECTIONS.filter((s) => !detected.includes(s))
  return { detected, missing }
}

export function detectContact(text: string): AtsContact {
  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? null
  const phone =
    text.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/)?.[0]?.trim() ?? null

  const links = new Set<string>()
  let m: RegExpExecArray | null
  const urlRe = /(https?:\/\/[^\s)]+|(?:www\.|linkedin\.com|github\.com)[^\s)]*)/gi
  while ((m = urlRe.exec(text)) !== null) {
    links.add(m[0].replace(/[.,;]+$/, ''))
  }

  // Light location heuristic: "City, ST" or "City, Country".
  const locationFound = /[A-Z][a-zA-Z.\- ]+,\s*(?:[A-Z]{2}\b|[A-Z][a-z]+)/.test(text)

  return { email, phone, links: Array.from(links), locationFound }
}

export function keywordStats(text: string): KeywordStat[] {
  const lower = text.toLowerCase()
  const stats: KeywordStat[] = []

  for (const entry of SKILLS_DICTIONARY) {
    let count = 0
    const aliases = Array.from(new Set([entry.canonical.toLowerCase(), ...entry.aliases]))
    for (const alias of aliases) {
      const re = new RegExp(`(^|[^a-z0-9+#])${escapeRe(alias)}([^a-z0-9+#]|$)`, 'gi')
      const matches = lower.match(re)
      if (matches) count += matches.length
    }
    if (count > 0) stats.push({ term: entry.canonical, count })
  }

  return stats.sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
}

// Detect glued words: camelCase joins where neither half is a known brand.
export function detectGluedWords(text: string): string[] {
  const candidates = text.match(/\b[a-z]+[A-Z][a-zA-Z]*\b/g) ?? []
  const glued = new Set<string>()
  for (const word of candidates) {
    if (BRAND_ALLOWLIST.has(word.toLowerCase())) continue
    glued.add(word)
  }
  return Array.from(glued)
}

function countActionVerbs(text: string): number {
  const lower = text.toLowerCase()
  let count = 0
  for (const verb of ACTION_VERBS) {
    const matches = lower.match(new RegExp(`(^|[^a-z])${verb}(ed|s)?([^a-z]|$)`, 'g'))
    if (matches) count += matches.length
  }
  return count
}

function hasMetrics(text: string): boolean {
  // Numbers with %, $, x-multipliers, or large magnitudes signal quantified impact.
  return /(\d+%|\$\d|\b\d+x\b|\b\d{2,}\b|\bmillion\b|\bthousand\b)/i.test(text)
}

export interface QualityInput {
  text: string
  sections: AtsSections
  contact: AtsContact
  pageCount: number | null
  targetPages: number
  wordCount: number
  source: 'pdf' | 'tex'
}

export function qualityWarnings(input: QualityInput): AtsWarning[] {
  const warnings: AtsWarning[] = []
  const { text, sections, contact, pageCount, targetPages, wordCount, source } = input

  const glued = detectGluedWords(text)
  if (glued.length > 0) {
    warnings.push({
      level: 'error',
      code: 'GLUED_WORDS',
      message: `${glued.length} possible glued word${glued.length > 1 ? 's' : ''} an ATS may misread`,
      detail: glued.slice(0, 12).join(', '),
    })
  }

  for (const section of sections.missing) {
    warnings.push({
      level: 'warn',
      code: 'MISSING_SECTION',
      message: `Missing a "${section}" section`,
      detail: 'ATS parsers look for standard section headings to bucket your content.',
    })
  }

  if (source === 'pdf' && pageCount !== null && pageCount > targetPages) {
    warnings.push({
      level: 'warn',
      code: 'PAGE_OVERFLOW',
      message: `Resume is ${pageCount} pages (target ${targetPages})`,
      detail: 'Most recruiters skim 1–2 pages. Trim older or less relevant content.',
    })
  }

  if (!contact.email) {
    warnings.push({
      level: 'error',
      code: 'NO_EMAIL',
      message: 'No email address detected',
      detail: 'An ATS cannot route your resume without a parseable email.',
    })
  }
  if (!contact.phone) {
    warnings.push({ level: 'warn', code: 'NO_PHONE', message: 'No phone number detected' })
  }
  if (contact.links.length === 0) {
    warnings.push({
      level: 'info',
      code: 'NO_LINKS',
      message: 'No LinkedIn / GitHub / portfolio links detected',
    })
  }

  if (wordCount < 200) {
    warnings.push({
      level: 'warn',
      code: 'SHORT_RESUME',
      message: `Only ${wordCount} words — the resume looks sparse`,
      detail: 'A strong one-pager typically runs 350–600 words.',
    })
  }

  const verbs = countActionVerbs(text)
  if (verbs < 5 && wordCount > 150) {
    warnings.push({
      level: 'info',
      code: 'FEW_ACTION_VERBS',
      message: 'Few strong action verbs detected',
      detail: 'Start bullets with verbs like "Led", "Built", "Reduced", "Shipped".',
    })
  }

  if (!hasMetrics(text) && wordCount > 150) {
    warnings.push({
      level: 'info',
      code: 'NO_METRICS',
      message: 'No quantified impact detected',
      detail: 'Add numbers: "%", "$", "3x", "10k users" — metrics make bullets land.',
    })
  }

  return warnings
}

// Composite 0–100 score from warning weights.
export function computeParseQuality(warnings: AtsWarning[]): number {
  let score = 100
  for (const w of warnings) {
    if (w.level === 'error') score -= 18
    else if (w.level === 'warn') score -= 9
    else score -= 3
  }
  return Math.max(0, Math.min(100, score))
}

export interface ExtractedDoc {
  text: string
  perPageText: string[]
  pageCount: number | null
  source: 'pdf' | 'tex'
}

export function analyze(
  doc: ExtractedDoc,
  opts: { targetPages?: number } = {}
): AtsReport {
  const targetPages = opts.targetPages ?? 2
  const text = doc.text
  const wordCount = (text.match(/\b[\w'+#.-]+\b/g) ?? []).length

  const sections = detectSections(text)
  const contact = detectContact(text)
  const keywords = keywordStats(text)
  const warnings = qualityWarnings({
    text,
    sections,
    contact,
    pageCount: doc.pageCount,
    targetPages,
    wordCount,
    source: doc.source,
  })
  const parseQuality = computeParseQuality(warnings)

  return {
    source: doc.source,
    pageCount: doc.pageCount,
    overBudget: doc.source === 'pdf' && doc.pageCount !== null && doc.pageCount > targetPages,
    targetPages,
    wordCount,
    extractedText: text,
    perPageText: doc.perPageText,
    sections,
    contact,
    keywords,
    warnings,
    parseQuality,
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
