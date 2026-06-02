import Link from 'next/link'

type Props = {
  glyph: string
  title: string
  description: string
  meta?: string
  href: string
}

export function HubQuadrant({ glyph, title, description, meta, href }: Props) {
  return (
    <Link
      href={href}
      className="
        group flex flex-col justify-between p-8
        bg-void-black hover:bg-void-teal/5
        border-void-teal/10 transition-colors duration-300
        focus:outline-none focus:ring-1 focus:ring-void-teal/40
      "
    >
      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-sm tracking-widest uppercase text-void-teal group-hover:text-void-teal transition-colors">
          {glyph} {title}
        </h2>
        <p className="font-mono text-xs tracking-wide text-white/30 leading-relaxed uppercase">
          {description}
        </p>
      </div>
      {meta && (
        <p className="mt-6 font-mono text-xs tracking-widest text-white/15 uppercase">
          {meta}
        </p>
      )}
    </Link>
  )
}
