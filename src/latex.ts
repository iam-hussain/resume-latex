import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const latexjs: any = require('latex.js')

const DEFAULT_SOURCE = process.env.TEX_SOURCE ?? 'full_stack_ai.tex'
const DEFAULT_OUTDIR = path.resolve(process.cwd(), 'build')

export interface LatexRenderOptions {
  sourcePath?: string
  outDir?: string
}

function resolveSource(sourcePath?: string): string {
  const candidate = sourcePath ?? DEFAULT_SOURCE
  const absolute = path.resolve(process.cwd(), candidate)
  if (!absolute.startsWith(process.cwd())) {
    throw new Error('Source path must be inside the project directory')
  }
  return absolute
}

export async function readLatex(sourcePath?: string): Promise<string> {
  const absolute = resolveSource(sourcePath)
  return fs.promises.readFile(absolute, 'utf8')
}

export async function renderHtml(options: LatexRenderOptions = {}): Promise<string> {
  const tex = await readLatex(options.sourcePath)
  const generator = new latexjs.HtmlGenerator({ hyphenate: false })
  latexjs.parse(tex, { generator })
  const document: Document | undefined = generator.document
  const html =
    document?.documentElement?.outerHTML ??
    generator.htmlDocument?.()?.documentElement?.outerHTML ??
    '<p>Unable to render LaTeX</p>'
  return `<!doctype html>${html}`
}

export async function renderXml(options: LatexRenderOptions = {}): Promise<string> {
  const html = await renderHtml(options)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<resume><![CDATA[\n${html}\n]]></resume>`
}

function execLatexmk(sourcePath: string, outDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfName = `${path.basename(sourcePath, path.extname(sourcePath))}.pdf`
    const child = spawn(
      'latexmk',
      ['-pdf', '-interaction=nonstopmode', '-halt-on-error', `-outdir=${outDir}`, sourcePath],
      { stdio: 'inherit' }
    )

    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) {
        resolve(path.join(outDir, pdfName))
        return
      }
      reject(new Error(`latexmk exited with code ${code ?? -1}`))
    })
  })
}

export async function buildPdf(options: LatexRenderOptions = {}): Promise<string> {
  const sourcePath = resolveSource(options.sourcePath)
  const outDir = options.outDir ? path.resolve(process.cwd(), options.outDir) : DEFAULT_OUTDIR
  await fs.promises.mkdir(outDir, { recursive: true })
  return execLatexmk(sourcePath, outDir)
}

