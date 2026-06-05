import { BackLink } from '@/components/shared/BackLink'
import { TopBar } from '@/components/shared/TopBar'
import type { Tool } from '@/data/tools'

type Props = {
  tool: Tool
  children: React.ReactNode
  fullBleed?: boolean
  characterName?: string
}

export function ToolShell({ tool, children, fullBleed = false, characterName }: Props) {
  return (
    <div className={`bg-void-black flex flex-col ${fullBleed ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      <TopBar characterName={characterName} />
      <div className="border-b border-void-teal/10 px-6 py-3 flex-shrink-0">
        <BackLink href="/tools" label="Tools" />
      </div>
      <div className="relative px-6 py-4 flex-shrink-0">
        {/* Left accent bar — mirrors the HUD pattern across the app */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-void-teal/60 via-void-teal/25 to-transparent"
        />
        <div className="flex items-baseline gap-4">
          <h1 className="font-mono text-lg tracking-widest uppercase text-void-teal">
            {tool.name}
          </h1>
          <span className="font-mono text-xs tracking-widest text-void-teal/30 uppercase">
            {tool.category}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs tracking-wide text-white/30">
          {tool.description}
        </p>
        {/* Gradient HUD underline with a one-shot scan spot, matching SectionTitle */}
        <div className="absolute left-0 right-0 bottom-0 h-px overflow-hidden">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-void-teal/40 via-void-teal/15 to-transparent"
          />
          <span aria-hidden="true" className="tool-shell-header-scan" />
        </div>
      </div>
      <div className={`flex-1 min-h-0 flex flex-col ${fullBleed ? '' : 'px-6 py-8'}`}>
        {children}
      </div>
    </div>
  )
}
