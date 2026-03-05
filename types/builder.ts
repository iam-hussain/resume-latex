export type PreviewStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ApiPreviewRequest {
  tex: string
}

export interface ApiPreviewResponse {
  html?: string
  error?: string
}
