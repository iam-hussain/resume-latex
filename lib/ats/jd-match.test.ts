import { describe, it, expect } from 'vitest'
import { matchJd } from './jd-match'

describe('matchJd', () => {
  const resume = 'Built React and TypeScript apps backed by Node.js and PostgreSQL on AWS.'

  it('scores 100 when the resume covers every JD skill', () => {
    const jd = 'We want React and TypeScript and Node.js experience.'
    const result = matchJd(resume, jd)
    expect(result.score).toBe(100)
    expect(result.missing).toHaveLength(0)
    expect(result.matched.map((m) => m.term)).toEqual(
      expect.arrayContaining(['React', 'TypeScript', 'Node.js'])
    )
  })

  it('surfaces JD skills missing from the resume', () => {
    const jd = 'Looking for Kubernetes, Go, and GraphQL experience. Bonus: React.'
    const result = matchJd(resume, jd)
    const missing = result.missing.map((m) => m.term)
    expect(missing).toContain('Kubernetes')
    expect(missing).toContain('Go')
    expect(missing).toContain('GraphQL')
    expect(result.matched.map((m) => m.term)).toContain('React')
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThan(100)
  })

  it('normalizes aliases (k8s -> Kubernetes)', () => {
    const result = matchJd('Deployed to Kubernetes clusters', 'Experience with k8s required')
    expect(result.matched.map((m) => m.term)).toContain('Kubernetes')
    expect(result.score).toBe(100)
  })

  it('returns score 0 when the JD has no recognized skills', () => {
    const result = matchJd(resume, 'We value teamwork and communication.')
    expect(result.score).toBe(0)
  })
})
