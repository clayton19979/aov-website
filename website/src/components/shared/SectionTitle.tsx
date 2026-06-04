type Props = {
  glyph?: string
  title: string
  subtitle?: string
}

export function SectionTitle({ glyph = '⬡', title, subtitle }: Props) {
  return (
    <div className="mb-8">
      <h1 className="section-title-glow font-mono text-sm tracking-widest uppercase text-void-teal">
        {glyph} {title}
      </h1>
      {subtitle && (
        <p className="mt-1 font-mono text-xs tracking-wider text-white/30 uppercase">
          {subtitle}
        </p>
      )}
      <div className="relative mt-3">
        <div className="section-divider-line h-px w-full bg-gradient-to-r from-void-teal/60 via-void-teal/20 to-transparent" />
        <span
          className="section-divider-node absolute left-0 top-1/2 size-[5px] -translate-x-px -translate-y-1/2 rounded-full"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
