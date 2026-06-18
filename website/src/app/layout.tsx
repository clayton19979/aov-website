import type { Metadata } from "next"
import { headers } from "next/headers"
import "./globals.css"
import { SuiProviders } from "@/components/providers/SuiProviders"
import { PageTransition } from "@/components/providers/PageTransition"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { routeMetadata, siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  ...routeMetadata("/"),
  icons: { icon: "/favicon.ico" },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the nonce injected by middleware (src/middleware.ts). The middleware
  // sets `x-nonce` on the request so that only this stamped script tag is
  // allowed to run inline — the CSP no longer needs `'unsafe-inline'` for
  // script-src.
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html lang="en" className="bg-void-black">
      <head>
        {/* Prevent flash of unstyled theme on load. The nonce attribute is
            required because the CSP (set by middleware) uses a per-request
            nonce instead of 'unsafe-inline' for script-src. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('aov-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }}
        />
      </head>
      <body className="bg-void-black text-white/90 font-mono antialiased min-h-screen">
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
