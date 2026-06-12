// Resume text extraction with two backends behind one interface:
//
//   1. extractFromPdf  — pdfjs-dist, reconstructs ATS reading order from item
//      x/y positions. Highest fidelity (exact page count, glued-word signal),
//      but needs a compiled PDF (LaTeX toolchain present).
//   2. extractFromTex  — lib/ats/strip-tex, dependency-free. Always available;
//      used as the fallback when no PDF can be compiled.
//
// analyzeResume() ties them together: compile + PDF-extract when possible, else
// fall back to the .tex source so the analyzer always returns a report.

import type { AtsReport } from '@/types/ats'
import { analyze, type ExtractedDoc } from './analyze'
import { matchJd } from './jd-match'
import { stripTex } from './strip-tex'
import { compilePdf, LatexCompileError } from '@/lib/latex'

const X_GAP_SPACE_THRESHOLD = 1.2 // multiples of mean char width → insert a space

interface PdfTextItem {
  str: string
  transform: number[] // [a, b, c, d, e(x), f(y)]
  width: number
}

/**
 * Extract text from a compiled PDF using pdfjs-dist (Node-safe legacy build,
 * worker disabled). Reconstructs lines by grouping items on the same y, sorting
 * by x, and inserting spaces where the x-gap exceeds a threshold.
 */
export async function extractFromPdf(buffer: Buffer): Promise<ExtractedDoc> {
  // Lazy, dynamic import: keeps pdfjs out of the bundle until first use and
  // lets the caller degrade gracefully if it fails to load in this runtime.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Disable the worker — we run in Node, single-threaded.
  // @ts-expect-error workerSrc is settable at runtime
  pdfjs.GlobalWorkerOptions.workerSrc = undefined

  const data = new Uint8Array(buffer)
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise

  const perPageText: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const items = content.items as unknown as PdfTextItem[]
    perPageText.push(reconstructPage(items))
  }
  await doc.destroy()

  const text = perPageText.join('\n\n').trim()
  return { text, perPageText, pageCount: doc.numPages, source: 'pdf' }
}

function reconstructPage(items: PdfTextItem[]): string {
  if (items.length === 0) return ''

  // Group items into lines by rounded y (transform[5]).
  const lines = new Map<number, PdfTextItem[]>()
  for (const item of items) {
    if (!item.str) continue
    const y = Math.round(item.transform[5] ?? 0)
    const bucket = lines.get(y) ?? []
    bucket.push(item)
    lines.set(y, bucket)
  }

  // Sort lines top-to-bottom (PDF y grows upward, so descending y).
  const sortedY = Array.from(lines.keys()).sort((a, b) => b - a)

  const out: string[] = []
  for (const y of sortedY) {
    const lineItems = (lines.get(y) ?? []).sort(
      (a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0)
    )
    const meanCharWidth = estimateMeanCharWidth(lineItems)
    let line = ''
    let prevEnd: number | null = null
    for (const item of lineItems) {
      const x = item.transform[4] ?? 0
      if (prevEnd !== null) {
        const gap = x - prevEnd
        if (gap > meanCharWidth * X_GAP_SPACE_THRESHOLD && !line.endsWith(' ')) {
          line += ' '
        }
      }
      line += item.str
      prevEnd = x + item.width
    }
    out.push(line.trim())
  }
  return out.join('\n')
}

function estimateMeanCharWidth(items: PdfTextItem[]): number {
  let totalWidth = 0
  let totalChars = 0
  for (const item of items) {
    if (item.str.length > 0) {
      totalWidth += item.width
      totalChars += item.str.length
    }
  }
  return totalChars > 0 ? totalWidth / totalChars : 5
}

/** Dependency-free extraction straight from LaTeX source. */
export function extractFromTex(tex: string): ExtractedDoc {
  const text = stripTex(tex)
  // We cannot know the real page count without compiling. Estimate from word
  // count (~500 words/page is a reasonable resume density).
  const wordCount = (text.match(/\b[\w'+#.-]+\b/g) ?? []).length
  const pageCount = wordCount > 0 ? Math.max(1, Math.round(wordCount / 500)) : null
  return { text, perPageText: [text], pageCount, source: 'tex' }
}

export interface AnalyzeResult {
  report: AtsReport
  /** Present when LaTeX compilation failed but we still analyzed the source. */
  compileError?: { message: string; line?: number }
}

/**
 * End-to-end: compile → PDF-extract when a LaTeX toolchain is available, else
 * fall back to the .tex source. Always returns a report; never throws on a
 * missing toolchain or a compile error (those are reported in the result).
 */
export async function analyzeResume(
  tex: string,
  opts: { targetPages?: number; jobDescription?: string } = {}
): Promise<AnalyzeResult> {
  let doc: ExtractedDoc
  let compileError: { message: string; line?: number } | undefined

  try {
    const { buffer } = await compilePdf(tex)
    try {
      doc = await extractFromPdf(buffer)
    } catch {
      // pdfjs couldn't read the PDF in this runtime — degrade to tex source.
      doc = extractFromTex(tex)
    }
  } catch (err) {
    // Compile failed (or no toolchain). Analyze the source so the panel still
    // works, and surface the LaTeX error if there was one.
    if (err instanceof LatexCompileError) {
      compileError = { message: err.message, line: err.line }
    }
    doc = extractFromTex(tex)
  }

  const report = analyze(doc, { targetPages: opts.targetPages })

  if (opts.jobDescription && opts.jobDescription.trim()) {
    report.jdMatch = matchJd(report.extractedText, opts.jobDescription)
  }

  return { report, compileError }
}
