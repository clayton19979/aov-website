import Link from 'next/link'

type Props = {
  href: string
  label: string
}

export function BackLink({ href, label }: Props) {
  return (
    <Link
      href={href}
      className="group relative inline-flex items-center gap-2 pl-3 font-mono text-xs tracking-widest uppercase text-void-teal/50 hover:text-void-teal transition-colors duration-300"
    >
      {/* Left accent bar — mirrors the pattern on HubQuadrant / ToolCard / DesignationNodeCard */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-void-teal opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
      <span className="inline-block transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
      <span>{label}</span>
    </Link>
  )
}
