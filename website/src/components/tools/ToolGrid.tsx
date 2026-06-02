import { TOOL_CATEGORIES } from '@/data/tools'
import type { Tool } from '@/data/tools'
import { ToolCard } from './ToolCard'

type Props = {
  tools: Tool[]
}

export function ToolGrid({ tools }: Props) {
  const categories = TOOL_CATEGORIES.filter(cat =>
    tools.some(t => t.category === cat)
  )

  return (
    <div className="flex flex-col gap-10">
      {categories.map(category => (
        <section key={category}>
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal/40 mb-4 pb-2 border-b border-void-teal/10">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools
              .filter(t => t.category === category)
              .map(tool => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
