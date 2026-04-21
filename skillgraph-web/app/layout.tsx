import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import { validateEnv } from '@/lib/validateEnv'

// Validate environment variables at startup
validateEnv()
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SkillGraph — AI Career Intelligence Platform',
  description: 'Upload your resume. See exactly what\'s stopping you from your dream job. Get a 7-day plan to fix it.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
