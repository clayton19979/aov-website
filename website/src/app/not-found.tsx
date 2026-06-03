import Link from 'next/link'

export const metadata = {
  title: '404 — AoV',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void-black flex flex-col items-center justify-center px-6 font-mono">
      <div className="max-w-md w-full border border-void-teal/20 bg-void-black/60 p-8 text-center space-y-6">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.3em] text-void-teal/60 uppercase">Registry Error</p>
          <h1 className="text-2xl tracking-[0.2em] text-void-teal uppercase glitch-title">
            Node Not Found
          </h1>
        </div>

        <div className="border-t border-void-teal/10 pt-6 space-y-2">
          <p className="text-xs tracking-widest text-white/40 uppercase">
            This node does not exist in the registry.
          </p>
          <p className="text-xs text-white/20 tracking-widest">
            The path you requested has no signal.
          </p>
        </div>

        <Link
          href="/hub"
          className="block px-4 py-2 text-xs tracking-[0.2em] uppercase border border-void-teal/40 text-void-teal hover:bg-void-teal/10 transition-colors"
        >
          Return to Hub
        </Link>
      </div>
    </div>
  )
}
