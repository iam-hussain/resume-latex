export async function postPreview(tex: string): Promise<Blob> {
  const res = await fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tex }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  return res.blob()
}

export async function postPdf(tex: string): Promise<Blob> {
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tex }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  return res.blob()
}

export async function listResumeFiles(): Promise<string[]> {
  const res = await fetch('/api/resumes')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  const data = (await res.json()) as { files?: string[] }
  return data.files ?? []
}

export async function loadResumeFile(fileName: string): Promise<string> {
  const params = new URLSearchParams({ file: fileName })
  const res = await fetch(`/api/resumes?${params.toString()}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  const data = (await res.json()) as { content?: string }
  return data.content ?? ''
}

export async function saveResumeFile(fileName: string, content: string): Promise<void> {
  const res = await fetch('/api/resumes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, content }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
}

export async function createResumeFile(fileName: string, content: string): Promise<string> {
  const res = await fetch('/api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, content }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? res.statusText)
  }
  const data = (await res.json()) as { fileName?: string }
  return data.fileName ?? fileName
}
