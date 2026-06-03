'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/shared/TopBar'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ToolsError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[AoV] Tools section error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full border border-void-teal/20 bg-void-black/60 p-8 text-center space-y-6 font-mono">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.3em] text-void-teal/60 uppercase">Forge Fault</p>
            <h1 className="text-xl tracking-[0.2em] text-void-teal uppercase glitch-title">
              Interface Failure
            </h1>
          </div>

          <div className="border-t border-void-teal/10 pt-6">
            <p className="text-xs tracking-widest text-white/40 uppercase">
              This tool encountered an unresolved fault.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-white/20 tracking-widest">
                ref: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 text-xs tracking-[0.2em] uppercase border border-void-teal/40 text-void-teal hover:bg-void-teal/10 transition-colors"
            >
              Retry
            </button>
            <Link
              href="/tools"
              className="flex-1 px-4 py-2 text-xs tracking-[0.2em] uppercase border border-white/15 text-white/40 hover:text-white/70 hover:border-white/30 transition-colors text-center"
            >
              Back to Forge
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
