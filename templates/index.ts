import fs from 'fs'
import path from 'path'

const TEMPLATES_DIR = path.join(process.cwd(), 'templates')

export function getDefaultTemplate(): string {
  const defaultPath = path.join(TEMPLATES_DIR, 'default.tex')
  return fs.readFileSync(defaultPath, 'utf8')
}

export function getTemplate(id: string): string {
  const safeId = path.basename(id, '.tex')
  const templatePath = path.join(TEMPLATES_DIR, `${safeId}.tex`)
  if (!templatePath.startsWith(TEMPLATES_DIR)) {
    throw new Error('Invalid template id')
  }
  return fs.readFileSync(templatePath, 'utf8')
}
