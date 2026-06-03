import { BackLink } from '@/components/shared/BackLink'
import type { Tool } from '@/data/tools'

type Props = {
  tool: Tool
  children: React.ReactNode
  fullBleed?: boolean
}

export function ToolShell({ tool, children, fullBleed = false }: Props) {
  return (
    <div className={`bg-void-black flex flex-col ${fullBleed ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <div className="border-b border-void-teal/10 px-6 py-3 flex-shrink-0">
        <BackLink href="/tools" label="Tools" />
      </div>
      <div className="px-6 py-4 border-b border-void-teal/10 flex-shrink-0">
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
      </div>
      <div className={`flex-1 min-h-0 flex flex-col ${fullBleed ? '' : 'px-6 py-8'}`}>
        {children}
      </div>
    </div>
  )
}
