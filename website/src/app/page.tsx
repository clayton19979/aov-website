import Link from 'next/link'
import { LandingHero } from '@/components/landing/LandingHero'
import { routeMetadata } from '@/lib/site'

const DISCORD_URL = 'https://discord.gg/uZtwGbngr7'

const SELECTION_SIGNALS = [
  {
    label: 'Public Signal',
    title: 'Selection, not volume',
    body: 'AoV is built for players who find standards clarifying. The filter exists before first contact.',
  },
  {
    label: 'Void Statement',
    title: 'Purpose over history',
    body: 'The first threshold asks what function you intend to serve, not how long you have been elsewhere.',
  },
  {
    label: 'Trial Operation',
    title: 'Function under stakes',
    body: 'Candidates are observed in real operational context: preparation, accountability, correction, and output.',
  },
] as const

const DOCTRINE_MARKERS = [
  'Weakness accelerates extinction.',
  'Conflict creates evolution.',
  'Usefulness defines value.',
  'Order must be imposed upon chaos.',
] as const

export const metadata = routeMetadata('/')

export default function LandingPage() {
  return (
    <main className="bg-void-black text-white/90">
      <LandingHero />

      <section className="relative border-t border-void-teal/10 px-6 py-14 md:py-18">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 45%, transparent), transparent)',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="max-w-xl">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-void-teal/50">
              Selection Protocol
            </p>
            <h2 className="font-mono text-2xl uppercase tracking-widest text-white/85 md:text-3xl">
              The order does not invite the uncertain.
            </h2>
            <p className="mt-5 font-mono text-sm leading-loose tracking-wide text-white/40">
              Architects of the Void is an EVE Frontier corporation shaped around AUREX, doctrine, and useful output.
              The public face should repel the casual and sharpen the attention of the aligned.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center border border-void-teal/50 px-5 py-3 font-mono text-xs uppercase tracking-widest text-void-teal transition-colors duration-300 hover:border-void-teal hover:bg-void-teal hover:text-void-black"
              >
                Request Entry
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center border border-white/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-white/40 transition-colors duration-300 hover:border-void-teal/40 hover:text-void-teal"
              >
                Member Access
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {SELECTION_SIGNALS.map((signal, index) => (
              <article
                key={signal.label}
                className="group relative min-h-36 border border-white/10 bg-white/[0.015] p-5 transition-colors duration-300 hover:border-void-teal/35"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-px opacity-55 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: 'linear-gradient(to bottom, var(--accent), transparent)',
                  }}
                />
                <div className="flex items-start gap-4">
                  <span className="font-mono text-[10px] tracking-widest text-void-teal/45">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/25">
                      {signal.label}
                    </p>
                    <h3 className="mt-2 font-mono text-sm uppercase tracking-widest text-white/75">
                      {signal.title}
                    </h3>
                    <p className="mt-3 font-mono text-xs leading-relaxed tracking-wide text-white/35">
                      {signal.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 w-full max-w-6xl border-t border-void-teal/10 pt-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DOCTRINE_MARKERS.map(marker => (
              <div
                key={marker}
                className="border-l border-void-teal/25 py-2 pl-4 font-mono text-xs uppercase leading-relaxed tracking-wide text-white/35"
              >
                {marker}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
