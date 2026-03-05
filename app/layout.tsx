import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TeX Resume Builder',
  description: 'Real-time LaTeX resume editor with live preview',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
