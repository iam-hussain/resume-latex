import { describe, it, expect } from 'vitest'
import { stripTex, extractUrls } from './strip-tex'

describe('stripTex', () => {
  it('keeps content and drops preamble commands', () => {
    const tex = `\\documentclass{article}
\\usepackage{geometry}
\\definecolor{accent}{HTML}{2244AA}
\\begin{document}
\\section{Experience}
\\textbf{Acme Corp} --- Senior Engineer
Led the migration to Kubernetes.
\\end{document}`
    const out = stripTex(tex)
    expect(out).toContain('Experience')
    expect(out).toContain('Acme Corp')
    expect(out).toContain('Kubernetes')
    expect(out).not.toContain('documentclass')
    expect(out).not.toContain('definecolor')
    expect(out).not.toContain('\\section')
  })

  it('unescapes special characters', () => {
    expect(stripTex('R\\&D and 50\\% growth')).toContain('R&D')
    expect(stripTex('R\\&D and 50\\% growth')).toContain('50%')
  })

  it('keeps href link text', () => {
    expect(stripTex('\\href{https://x.com}{My Portfolio}')).toContain('My Portfolio')
  })
})

describe('extractUrls', () => {
  it('pulls href, url and bare links', () => {
    const tex = '\\href{https://github.com/jane}{GH} contact linkedin.com/in/jane'
    const urls = extractUrls(tex)
    expect(urls).toContain('https://github.com/jane')
    expect(urls.some((u) => u.includes('linkedin.com/in/jane'))).toBe(true)
  })
})
