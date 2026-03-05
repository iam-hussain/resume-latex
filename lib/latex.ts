import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import { JSDOM } from 'jsdom'

const BASE_URL = 'http://localhost/'

type LatexJs = {
  HtmlGenerator: new (opts: { hyphenate: boolean }) => {
    document?: { documentElement?: { outerHTML?: string } }
    htmlDocument?: () => { documentElement?: { outerHTML?: string } }
  }
  parse: (tex: string, opts: { generator: InstanceType<LatexJs['HtmlGenerator']> }) => void
}

let latexjsPromise: Promise<LatexJs> | null = null

function ensureDom(): void {
  const g = globalThis as unknown as { document?: Document; window?: Window }
  if (typeof g.document !== 'undefined') return
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: BASE_URL,
  })
  g.document = dom.window.document
  g.window = dom.window as unknown as Window
}

async function getLatexJs(): Promise<LatexJs> {
  ensureDom()
  if (!latexjsPromise) {
    latexjsPromise = import('latex.js').then((m) => (m.default ?? m) as LatexJs)
  }
  return latexjsPromise
}

function escapeForHtml(tex: string): string {
  return tex
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fallbackPreviewHtml(tex: string): string {
  const escaped = escapeForHtml(tex)
  return `<!doctype html><html><head><meta charset="utf-8"/></head><body><div style="padding:1rem;max-width:48rem;margin:0 auto;"><h2 style="font-size:1rem;color:#374151;margin-bottom:0.5rem;">Preview not available for this document</h2><p style="color:#6b7280;font-size:0.875rem;margin-bottom:1rem;">This resume uses LaTeX that the live preview cannot render (e.g. <code>\\definecolor</code>, <code>\\usepackage{paracol}</code>, custom macros). The editor still works: use <strong>Download PDF</strong> above to compile with pdflatex and get the correct PDF.</p><pre style="font-family:monospace;white-space:pre-wrap;padding:1rem;background:#f3f4f6;border-radius:0.5rem;overflow:auto;font-size:0.8rem;">${escaped}</pre></div></body></html>`
}

export async function renderHtmlFromString(tex: string): Promise<string> {
  ensureDom()
  try {
    const latexjs = await getLatexJs()
    const generator = new latexjs.HtmlGenerator({ hyphenate: false })
    latexjs.parse(tex, { generator })
    const document = generator.document
    const html =
      document?.documentElement?.outerHTML ??
      (() => {
        try {
          return generator.htmlDocument?.()?.documentElement?.outerHTML
        } catch {
          return undefined
        }
      })() ??
      '<p>Unable to render LaTeX</p>'
    return html.startsWith('<!doctype') ? html : `<!doctype html>${html}`
  } catch {
    // latex.js may throw on parse (e.g. \definecolor, Invalid URL in Node); show TeX source instead.
    return fallbackPreviewHtml(tex)
  }
}

function execLatexmk(sourcePath: string, outDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfName = `${path.basename(sourcePath, path.extname(sourcePath))}.pdf`
    const child = spawn(
      'latexmk',
      ['-pdf', '-interaction=nonstopmode', '-halt-on-error', `-outdir=${outDir}`, sourcePath],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    )

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(path.join(outDir, pdfName))
        return
      }
      reject(new Error(`latexmk exited with code ${code ?? -1}`))
    })
  })
}

export async function buildPdfFromString(tex: string, outDir?: string): Promise<Buffer> {
  const dir = outDir ?? path.join(os.tmpdir(), `resume-build-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
  await fs.promises.mkdir(dir, { recursive: true })
  const texPath = path.join(dir, 'document.tex')
  await fs.promises.writeFile(texPath, tex, 'utf8')
  try {
    const pdfPath = await execLatexmk(texPath, dir)
    const buffer = await fs.promises.readFile(pdfPath)
    return buffer
  } finally {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }
}
