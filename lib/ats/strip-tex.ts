// Convert raw LaTeX source into the plain text an ATS would read.
//
// This is the dependency-free extraction path: it always works, even when no
// LaTeX toolchain is installed. When a PDF *can* be compiled, lib/ats/extract.ts
// provides a higher-fidelity reading (exact page count, glued-word detection).

const BLANK = ' '

// Commands whose entire argument should be dropped (preamble / non-content).
const DROP_WITH_ARG = [
  'usepackage',
  'documentclass',
  'definecolor',
  'colorlet',
  'pagestyle',
  'thispagestyle',
  'geometry',
  'titleformat',
  'titlespacing',
  'setlength',
  'addtolength',
  'renewcommand',
  'newcommand',
  'providecommand',
  'newcolumntype',
  'columnratio',
  'setcounter',
  'hypersetup',
  'fancyhf',
  'fancyfoot',
  'fancyhead',
  'input',
  'include',
  'includegraphics',
  'vspace',
  'hspace',
  'rule',
  'label',
  'ref',
  'cite',
  'bibliographystyle',
  'bibliography',
]

// Commands whose argument IS visible content and should be kept.
const KEEP_ARG = [
  'section',
  'subsection',
  'subsubsection',
  'textbf',
  'textit',
  'texttt',
  'emph',
  'underline',
  'textsc',
  'large',
  'Large',
  'huge',
  'Huge',
  'item',
]

function stripComments(tex: string): string {
  // Remove unescaped % comments to end of line.
  return tex.replace(/(^|[^\\])%.*$/gm, '$1')
}

// Pull URLs out before we discard commands so they can be reported as links.
export function extractUrls(tex: string): string[] {
  const urls = new Set<string>()
  const patterns = [
    /\\href\s*\{([^}]*)\}/g,
    /\\url\s*\{([^}]*)\}/g,
    /https?:\/\/[^\s})\]]+/g,
    /(?:linkedin\.com|github\.com)\/[^\s})\]]+/gi,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(tex)) !== null) {
      const raw = (m[1] ?? m[0]).trim().replace(/[.,;]+$/, '')
      if (raw) urls.add(raw)
    }
  }
  return Array.from(urls)
}

function dropCommandsWithArgs(tex: string): string {
  let out = tex
  for (const cmd of DROP_WITH_ARG) {
    // \cmd[opt]{arg}{arg2}... — remove command and its brace/bracket groups.
    const re = new RegExp(`\\\\${cmd}\\b\\s*(\\[[^\\]]*\\])?(\\s*\\{[^{}]*\\})*`, 'g')
    out = out.replace(re, BLANK)
  }
  return out
}

function keepCommandArgs(tex: string): string {
  let out = tex
  // \href{url}{text} -> text
  out = out.replace(/\\href\s*\{[^}]*\}\s*\{([^}]*)\}/g, ' $1 ')
  // \url{url} -> url
  out = out.replace(/\\url\s*\{([^}]*)\}/g, ' $1 ')
  for (const cmd of KEEP_ARG) {
    const re = new RegExp(`\\\\${cmd}\\b\\s*(\\[[^\\]]*\\])?\\s*\\{([^{}]*)\\}`, 'g')
    out = out.replace(re, ' $2 ')
  }
  return out
}

/**
 * Strip LaTeX markup down to readable text. Best-effort, not a full parser —
 * good enough to feed section/contact/keyword detection.
 */
export function stripTex(tex: string): string {
  let s = stripComments(tex)

  // Drop everything before \begin{document} if present (preamble noise).
  const docStart = s.indexOf('\\begin{document}')
  if (docStart !== -1) s = s.slice(docStart + '\\begin{document}'.length)
  const docEnd = s.indexOf('\\end{document}')
  if (docEnd !== -1) s = s.slice(0, docEnd)

  s = keepCommandArgs(s)
  s = dropCommandsWithArgs(s)

  // Remove environment delimiters but keep their inner content.
  s = s.replace(/\\(begin|end)\s*\{[^}]*\}/g, BLANK)

  // Convert explicit line breaks to newlines.
  s = s.replace(/\\\\/g, '\n')

  // Any remaining \command (with optional [..] arg) -> space. This leaves
  // escaped specials like \& \% \_ alone (their char isn't [a-zA-Z@]).
  s = s.replace(/\\[a-zA-Z@]+\*?\s*(\[[^\]]*\])?/g, BLANK)

  // Strip braces and alignment ampersands — but NOT a backslash-escaped "&",
  // which is a literal ampersand we want to keep.
  s = s.replace(/[{}]/g, BLANK)
  s = s.replace(/(^|[^\\])&/g, '$1 ')
  s = s.replace(/~/g, ' ')

  // Now unescape the remaining specials to their literal characters.
  s = s.replace(/\\([&%_#$^])/g, '$1')

  // Collapse whitespace, preserve paragraph breaks.
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return s
}
