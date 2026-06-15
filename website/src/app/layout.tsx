import type { Metadata } from "next"
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-void-black">
      <head>
        {/* Prevent flash of unstyled theme on load */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('aov-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
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
