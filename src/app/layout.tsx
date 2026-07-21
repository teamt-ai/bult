import type { Metadata } from 'next'
import './globals.css'
import ThemeWrapper from '@/components/ThemeWrapper'

export const metadata: Metadata = {
  title: 'Bult - Create Custom Business AI Chatbots',
  description: 'Create custom ChatGPT-style AI chatbots trained exclusively on your business information. Zero hallucination, fast, and token-optimized.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  )
}
