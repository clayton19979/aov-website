import type { Metadata } from 'next'
import './globals.css'
import { SuiProviders } from '@/components/providers/SuiProviders'
import { PageTransition } from '@/components/providers/PageTransition'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'Architects of the Void',
  description: 'A militant techno-religious order operating at the edge of civilization.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-void-black">
      <body className="bg-void-black text-white/90 font-sans antialiased min-h-screen">
        <ThemeProvider>
          <SuiProviders>
            <PageTransition>
              {children}
            </PageTransition>
          </SuiProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
