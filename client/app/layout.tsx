import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Job Import System',
  description: 'Scalable Job Import System Admin UI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
