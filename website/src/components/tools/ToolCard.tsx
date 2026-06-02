import Link from 'next/link'
import type { Tool } from '@/data/tools'

type Props = {
  tool: Tool
}

export function ToolCard({ tool }: Props) {
  const isLive = tool.status === 'live'

  const inner = (
    <div
      className={`
        group flex flex-col justify-between p-6 h-full min-h-[140px]
        border transition-colors duration-200
        ${isLive
          ? 'border-void-teal/20 bg-void-teal/5 hover:bg-void-teal/10 hover:border-void-teal/40'
          : 'border-dashed border-void-teal/10 bg-transparent opacity-50 cursor-not-allowed'
        }
      `}
    >
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-sm tracking-widest uppercase text-void-teal">
          {tool.name}
        </h3>
        <p className="font-mono text-xs tracking-wide text-white/30 leading-relaxed">
          {tool.description}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest text-void-teal/40 uppercase">
          {tool.category}
        </span>
        {isLive && (
          <span className="font-mono text-xs text-void-teal/40 group-hover:text-void-teal transition-colors">
            → OPEN
          </span>
        )}
        {!isLive && (
          <span className="font-mono text-xs text-white/15 uppercase tracking-widest">
            Soon
          </span>
        )}
      </div>
    </div>
  )

  if (!isLive) return inner

  return (
    <Link href={`/tools/${tool.slug}`} className="block focus:outline-none focus:ring-1 focus:ring-void-teal/40">
      {inner}
    </Link>
  )
}
