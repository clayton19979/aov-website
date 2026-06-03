import type { ComponentType } from 'react'

function ToolPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 border border-dashed border-void-teal/15">
      <p className="font-mono text-xs tracking-widest uppercase text-white/15 text-center">
        {name}
      </p>
      <p className="mt-2 font-mono text-xs text-white/10">
        Full interface being fabricated.
      </p>
    </div>
  )
}

function FullBleedFrame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      className="w-full flex-1 border-0 block"
      style={{ minHeight: 0 }}
      title={title}
      allow="clipboard-write"
    />
  )
}

export const toolComponents: Record<string, ComponentType> = {
  'fuel-calculator': () => <ToolPlaceholder name="Fuel Calculator" />,
  'ssu-trade-hub': () => <ToolPlaceholder name="SSU Trade Hub" />,
  'void-map': () => <FullBleedFrame src="/tools/map/index.html" title="Void Map — Frontier GPS" />,
  'baseops-command-center': () => <FullBleedFrame src="/tools/baseops/index.html" title="BaseOps Command Center" />,
}
