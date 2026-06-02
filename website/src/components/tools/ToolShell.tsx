import { BackLink } from '@/components/shared/BackLink'
import type { Tool } from '@/data/tools'

type Props = {
  tool: Tool
  children: React.ReactNode
}

export function ToolShell({ tool, children }: Props) {
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <div className="border-b border-void-teal/10 px-6 py-4">
        <BackLink href="/tools" label="Tools" />
      </div>
      <div className="px-6 py-8 border-b border-void-teal/10">
        <div className="flex items-baseline gap-4">
          <h1 className="font-mono text-lg tracking-widest uppercase text-void-teal">
            {tool.name}
          </h1>
          <span className="font-mono text-xs tracking-widest text-void-teal/30 uppercase">
            {tool.category}
          </span>
        </div>
        <p className="mt-2 font-mono text-xs tracking-wide text-white/30">
          {tool.description}
        </p>
      </div>
      <div className="flex-1 px-6 py-8">
        {children}
      </div>
    </div>
  )
}
