import type { ComponentType } from 'react'

function ToolPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 border border-dashed border-void-teal/15 rounded-none">
      <p className="font-mono text-xs tracking-widest uppercase text-white/15 text-center">
        {name}
      </p>
      <p className="mt-2 font-mono text-xs text-white/10">
        Full interface being fabricated.
      </p>
    </div>
  )
}

export const toolComponents: Record<string, ComponentType> = {
  'fuel-calculator': () => <ToolPlaceholder name="Fuel Calculator" />,
  'ssu-trade-hub': () => <ToolPlaceholder name="SSU Trade Hub" />,
  'void-map': () => <ToolPlaceholder name="Void Map" />,
  'baseops-command-center': () => <ToolPlaceholder name="BaseOps Command Center" />,
}
