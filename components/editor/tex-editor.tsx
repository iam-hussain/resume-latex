'use client'

import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface TexEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function TexEditor({ value, onChange, placeholder }: TexEditorProps): React.ReactElement {
  return (
    <div className="h-full w-full min-h-0 flex flex-col">
      <MonacoEditor
        height="100%"
        language="plaintext"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'on',
          padding: { top: 12 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
        loading={placeholder ?? 'Loading editor…'}
      />
    </div>
  )
}
