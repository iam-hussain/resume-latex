import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

const RESUMES_DIR = path.join(process.cwd(), 'src', 'resumes')

function normalizeFileName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('File name is required')
  }
  const fileName = trimmed.endsWith('.tex') ? trimmed : `${trimmed}.tex`
  if (path.basename(fileName) !== fileName || fileName.includes('..')) {
    throw new Error('Invalid file name')
  }
  return fileName
}

function resolveResumePath(fileName: string): string {
  const absolute = path.resolve(RESUMES_DIR, fileName)
  if (!absolute.startsWith(RESUMES_DIR)) {
    throw new Error('Invalid file path')
  }
  return absolute
}

async function ensureResumesDir(): Promise<void> {
  await fs.promises.mkdir(RESUMES_DIR, { recursive: true })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureResumesDir()
    const file = request.nextUrl.searchParams.get('file')

    if (file) {
      const fileName = normalizeFileName(file)
      const content = await fs.promises.readFile(resolveResumePath(fileName), 'utf8')
      return NextResponse.json({ fileName, content })
    }

    const entries = await fs.promises.readdir(RESUMES_DIR, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tex'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))

    return NextResponse.json({ files })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read resumes'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureResumesDir()
    const body = (await request.json()) as { fileName?: string; content?: string }
    if (typeof body.fileName !== 'string') {
      throw new Error('fileName must be a string')
    }
    if (typeof body.content !== 'string') {
      throw new Error('content must be a string')
    }

    const fileName = normalizeFileName(body.fileName)
    const targetPath = resolveResumePath(fileName)

    try {
      await fs.promises.access(targetPath)
      return NextResponse.json({ error: 'File already exists' }, { status: 409 })
    } catch {
      // file does not exist, continue
    }

    await fs.promises.writeFile(targetPath, body.content, 'utf8')
    return NextResponse.json({ fileName })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create file'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureResumesDir()
    const body = (await request.json()) as { fileName?: string; content?: string }
    if (typeof body.fileName !== 'string') {
      throw new Error('fileName must be a string')
    }
    if (typeof body.content !== 'string') {
      throw new Error('content must be a string')
    }

    const fileName = normalizeFileName(body.fileName)
    const targetPath = resolveResumePath(fileName)
    await fs.promises.writeFile(targetPath, body.content, 'utf8')
    return NextResponse.json({ fileName })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save file'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
