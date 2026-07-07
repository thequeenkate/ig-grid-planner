import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IG Grid Planner',
  description: 'Notion-powered Instagram grid planner',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#8B1A1A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
