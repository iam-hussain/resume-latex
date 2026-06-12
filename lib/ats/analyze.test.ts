import { describe, it, expect } from 'vitest'
import {
  analyze,
  detectContact,
  detectSections,
  detectGluedWords,
  keywordStats,
  computeParseQuality,
  type ExtractedDoc,
} from './analyze'

function doc(text: string, source: 'pdf' | 'tex' = 'pdf', pageCount: number | null = 1): ExtractedDoc {
  return { text, perPageText: [text], pageCount, source }
}

const RESUME = `
Jane Doe
San Francisco, CA · jane.doe@example.com · (415) 555-0123
github.com/janedoe linkedin.com/in/janedoe

Summary
Senior software engineer with 8 years building distributed systems.

Experience
Acme Corp — Staff Engineer
Led migration to Kubernetes, reduced latency by 40% across services.
Built a RAG pipeline with LangChain and PostgreSQL serving 2M requests.

Skills
TypeScript, React, Node.js, AWS, Docker, Python

Education
B.S. Computer Science, MIT
`

describe('detectSections', () => {
  it('detects standard sections and reports missing ones', () => {
    const s = detectSections(RESUME)
    expect(s.detected).toContain('Summary')
    expect(s.detected).toContain('Experience')
    expect(s.detected).toContain('Skills')
    expect(s.detected).toContain('Education')
    expect(s.missing).toHaveLength(0)
  })

  it('flags a missing Skills section', () => {
    const s = detectSections('Summary\nExperience\nEducation\n')
    expect(s.missing).toContain('Skills')
  })
})

describe('detectContact', () => {
  it('parses email, phone, links and location', () => {
    const c = detectContact(RESUME)
    expect(c.email).toBe('jane.doe@example.com')
    expect(c.phone).toContain('555-0123')
    expect(c.links.length).toBeGreaterThanOrEqual(2)
    expect(c.locationFound).toBe(true)
  })

  it('returns nulls when contact info is absent', () => {
    const c = detectContact('just some words with no contact details')
    expect(c.email).toBeNull()
    expect(c.phone).toBeNull()
  })
})

describe('keywordStats', () => {
  it('counts canonical skills with aliases', () => {
    const stats = keywordStats(RESUME)
    const terms = stats.map((s) => s.term)
    expect(terms).toContain('TypeScript')
    expect(terms).toContain('Kubernetes')
    expect(terms).toContain('RAG')
    expect(terms).toContain('LangChain')
  })

  it('does not match substrings inside other words', () => {
    const stats = keywordStats('javascripting is not javascript-the-language reactionary')
    const js = stats.find((s) => s.term === 'JavaScript')
    // "javascript" appears once as a standalone-ish token; "javascripting" should not count
    expect(js?.count ?? 0).toBeLessThanOrEqual(1)
  })
})

describe('detectGluedWords', () => {
  it('flags non-brand camelCase joins', () => {
    expect(detectGluedWords('experienceLeading the team')).toContain('experienceLeading')
  })
  it('allows known brands', () => {
    expect(detectGluedWords('LangChain GitHub OpenShift')).toHaveLength(0)
  })
})

describe('computeParseQuality', () => {
  it('drops score per warning severity', () => {
    expect(computeParseQuality([])).toBe(100)
    expect(
      computeParseQuality([{ level: 'error', code: 'NO_EMAIL', message: '' }])
    ).toBe(82)
  })
})

describe('analyze', () => {
  it('produces a high-quality report for a clean resume', () => {
    const report = analyze(doc(RESUME, 'pdf', 1), { targetPages: 2 })
    expect(report.contact.email).toBe('jane.doe@example.com')
    expect(report.sections.missing).toHaveLength(0)
    expect(report.parseQuality).toBeGreaterThan(70)
    expect(report.overBudget).toBe(false)
    expect(report.source).toBe('pdf')
  })

  it('flags page overflow only for the pdf source', () => {
    const pdf = analyze(doc(RESUME, 'pdf', 3), { targetPages: 2 })
    expect(pdf.overBudget).toBe(true)
    expect(pdf.warnings.some((w) => w.code === 'PAGE_OVERFLOW')).toBe(true)

    const tex = analyze(doc(RESUME, 'tex', 3), { targetPages: 2 })
    expect(tex.overBudget).toBe(false)
    expect(tex.warnings.some((w) => w.code === 'PAGE_OVERFLOW')).toBe(false)
  })

  it('warns when email is missing', () => {
    const report = analyze(doc('Summary\nExperience\nSkills\nEducation\nsome content here'))
    expect(report.warnings.some((w) => w.code === 'NO_EMAIL')).toBe(true)
  })
})
