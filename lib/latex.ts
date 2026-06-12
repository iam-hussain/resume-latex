import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { spawn } from 'child_process'
import { JSDOM } from 'jsdom'

const BASE_URL = 'http://localhost/'

// A LaTeX compile error with the parsed log so callers can surface what broke.
export class LatexCompileError extends Error {
  log: string
  line?: number
  constructor(message: string, log: string, line?: number) {
    super(message)
    this.name = 'LatexCompileError'
    this.log = log
    this.line = line
  }
}

// Raised when no LaTeX toolchain is available in this environment.
export class LatexUnavailableError extends Error {
  constructor() {
    super('No LaTeX toolchain (latexmk) found on PATH')
    this.name = 'LatexUnavailableError'
  }
}

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

// Parse the first `file:line:` error out of latexmk/pdflatex output.
function parseLatexError(output: string): { message: string; line?: number } {
  const fileLine = output.match(/^[^:\n]+:(\d+):\s*(.+)$/m)
  if (fileLine) {
    return { message: (fileLine[2] ?? '').trim(), line: Number(fileLine[1]) }
  }
  const texError = output.match(/^! (.+)$/m)
  if (texError) return { message: (texError[1] ?? '').trim() }
  return { message: 'LaTeX compilation failed' }
}

function execLatexmk(sourcePath: string, outDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfName = `${path.basename(sourcePath, path.extname(sourcePath))}.pdf`
    let stdout = ''
    let stderr = ''
    const child = spawn(
      'latexmk',
      [
        '-pdf',
        '-interaction=nonstopmode',
        '-halt-on-error',
        '-file-line-error',
        `-outdir=${outDir}`,
        sourcePath,
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    )

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (err) => {
      // ENOENT → latexmk not installed.
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new LatexUnavailableError())
        return
      }
      reject(err)
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(path.join(outDir, pdfName))
        return
      }
      // Prefer the .log file (richer), fall back to captured stdio.
      let log = stdout + stderr
      try {
        const logPath = path.join(outDir, `${path.basename(sourcePath, path.extname(sourcePath))}.log`)
        if (fs.existsSync(logPath)) log = fs.readFileSync(logPath, 'utf8')
      } catch {
        // ignore
      }
      const { message, line } = parseLatexError(log)
      reject(new LatexCompileError(message, log.slice(-4000), line))
    })
  })
}

async function compileToBuffer(tex: string, outDir?: string): Promise<Buffer> {
  const dir =
    outDir ?? path.join(os.tmpdir(), `resume-build-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
  await fs.promises.mkdir(dir, { recursive: true })
  const texPath = path.join(dir, 'document.tex')
  await fs.promises.writeFile(texPath, tex, 'utf8')
  try {
    const pdfPath = await execLatexmk(texPath, dir)
    return await fs.promises.readFile(pdfPath)
  } finally {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }
}

// In-memory LRU cache keyed by sha256(tex). Preview, PDF download, and the ATS
// analyzer all reuse the same compiled PDF for identical source — one compile
// per edit instead of three.
const CACHE_CAP = 16
const compileCache = new Map<string, Buffer>()

function cacheKey(tex: string): string {
  return crypto.createHash('sha256').update(tex).digest('hex')
}

/** Cache-aware compile. Returns the PDF bytes and whether it was a cache hit. */
export async function compilePdf(tex: string): Promise<{ buffer: Buffer; cached: boolean }> {
  const key = cacheKey(tex)
  const hit = compileCache.get(key)
  if (hit) {
    // Refresh LRU recency.
    compileCache.delete(key)
    compileCache.set(key, hit)
    return { buffer: hit, cached: true }
  }
  const buffer = await compileToBuffer(tex)
  compileCache.set(key, buffer)
  if (compileCache.size > CACHE_CAP) {
    const oldest = compileCache.keys().next().value
    if (oldest !== undefined) compileCache.delete(oldest)
  }
  return { buffer, cached: false }
}

export async function buildPdfFromString(tex: string, outDir?: string): Promise<Buffer> {
  if (outDir) return compileToBuffer(tex, outDir)
  const { buffer } = await compilePdf(tex)
  return buffer
}
