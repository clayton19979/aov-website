import type { Kill } from '@/data/killboard'

function formatDate(iso: string) {
  const d = new Date(iso)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} · ${h}:${min}`
}

function formatValue(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return String(v)
}

type Props = { kill: Kill }

export function KillEntry({ kill }: Props) {
  const isDisputed = kill.status === 'disputed'

  return (
    <div className="border-b border-void-teal/10 py-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-8 group hover:bg-void-teal/[0.02] transition-colors duration-300 px-2 -mx-2">
      <div className="flex flex-col gap-1.5">
        {/* Target + ship */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-mono text-sm tracking-wide text-white/80 group-hover:text-white/90 transition-colors">
            {kill.target}
          </span>
          <span className="font-mono text-xs tracking-widest text-void-teal/50 uppercase">
            {kill.ship}
          </span>
          {isDisputed && (
            <span className="font-mono text-xs tracking-widest text-white/20 uppercase border border-white/10 px-1.5 py-0.5">
              Disputed
            </span>
          )}
        </div>

        {/* Location + timestamp */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-mono text-xs tracking-wide text-white/25">
            {kill.location}
          </span>
          <span className="font-mono text-xs text-white/15 tracking-widest">
            {formatDate(kill.timestamp)}
          </span>
        </div>

        {/* Pilots */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs tracking-widest text-void-teal/20 uppercase">
            Pilots:
          </span>
          {kill.pilots.map(p => (
            <span key={p} className="font-mono text-xs tracking-wide text-white/30">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Value */}
      <div className="flex md:flex-col md:items-end justify-between md:justify-center gap-1">
        <span className="font-mono text-sm tracking-widest text-void-teal/60 group-hover:text-void-teal/80 transition-colors">
          {formatValue(kill.value)}
        </span>
        <span className="font-mono text-xs tracking-widest text-void-teal/20 uppercase">
          STC
        </span>
      </div>
    </div>
  )
}
