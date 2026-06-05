import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { ScrollProgress } from '@/components/shared/ScrollProgress'
import { getSession } from '@/lib/session'
import { doctrine } from '@/data/doctrine'

export const metadata = {
  title: 'Doctrine — AoV',
}

export default async function DoctrinePage() {
  const session = await getSession()
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <ScrollProgress />
      <TopBar characterName={session?.characterName} />
      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle glyph="◈" title="DOCTRINE" subtitle="Canonical texts of the order" />

        {/* Core Beliefs */}
        <section className="mb-14">
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal mb-6">
            {doctrine.coreBeliefs.title}
          </h2>
          <p className="font-mono text-xs text-white/40 leading-relaxed tracking-wide mb-8">
            {doctrine.coreBeliefs.intro}
          </p>
          <div className="mb-8">
            <p className="font-mono text-xs tracking-widest uppercase text-white/20 mb-4">
              The Five Axioms
            </p>
            <ol className="flex flex-col">
              {doctrine.coreBeliefs.axioms.map((axiom, i, arr) => (
                <li key={i} className="relative flex items-start gap-5 pb-5 last:pb-0">
                  {/* connecting line linking this node to the next */}
                  {i < arr.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute left-3 top-6 bottom-0 w-px -translate-x-1/2"
                      style={{
                        background:
                          'linear-gradient(to bottom, color-mix(in srgb, var(--accent) 30%, transparent), transparent)',
                      }}
                    />
                  )}
                  {/* numbered node */}
                  <span
                    className="relative z-10 grid h-6 w-6 shrink-0 place-items-center font-mono text-[10px] tracking-wider"
                    style={{
                      color: 'var(--accent)',
                      border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                      background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
                      boxShadow: '0 0 8px 0 color-mix(in srgb, var(--accent) 12%, transparent)',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="pt-0.5 font-mono text-sm text-white/70 tracking-wide leading-relaxed">
                    {axiom}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative pl-6">
            <span
              className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-void-teal/55 via-void-teal/25 to-transparent"
              aria-hidden="true"
            />
            <p className="font-mono text-xs text-white/40 leading-loose tracking-wide italic">
              {doctrine.coreBeliefs.finalDoctrine}
            </p>
          </div>
        </section>

        <div className="h-px bg-void-teal/10 mb-14" />

        {/* The Void */}
        <section className="mb-14">
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal mb-6">
            {doctrine.theVoid.title}
          </h2>
          <div className="flex flex-col gap-5">
            {doctrine.theVoid.paragraphs.map((para, i) => (
              <p key={i} className="font-mono text-sm text-white/60 leading-loose tracking-wide">
                {para}
              </p>
            ))}
          </div>
        </section>

        <div className="h-px bg-void-teal/10 mb-14" />

        {/* Sacred Fragments */}
        <section className="mb-14">
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal mb-6">
            Sacred Fragments
          </h2>
          <div className="flex flex-col gap-10">
            {doctrine.sacredFragments.map((fragment, i) => (
              <article key={i}>
                <p className="font-mono text-xs tracking-widest uppercase text-white/20 mb-1">
                  {fragment.source}
                </p>
                <p className="font-mono text-xs text-void-teal/30 mb-4 italic">
                  — {fragment.attribution}
                </p>
                <blockquote className="relative pl-6">
                  <span
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-void-teal/55 via-void-teal/25 to-transparent"
                    aria-hidden="true"
                  />
                  <p className="font-mono text-sm text-white/50 leading-loose tracking-wide italic">
                    &ldquo;{fragment.text}&rdquo;
                  </p>
                </blockquote>
              </article>
            ))}
          </div>
        </section>

        <div className="h-px bg-void-teal/10 mb-14" />

        {/* Common Phrases */}
        <section className="mb-14">
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal mb-6">
            Common Phrases
          </h2>
          <p className="font-mono text-xs text-white/20 tracking-wide mb-6">
            Doctrine in compressed form. A member who uses them unselfconsciously has internalized the doctrine.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {doctrine.commonPhrases.map((phrase, i) => (
              <li
                key={i}
                className="group relative flex items-center gap-3 overflow-hidden pl-4 pr-3 py-2.5 transition-colors duration-300"
              >
                {/* left accent bar — dim by default, brightens on hover */}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 bottom-0 w-0.5 opacity-40 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      'linear-gradient(to bottom, var(--accent), color-mix(in srgb, var(--accent) 20%, transparent))',
                  }}
                />
                {/* hover wash */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'color-mix(in srgb, var(--accent) 5%, transparent)' }}
                />
                <span className="relative font-mono text-[10px] tracking-wider text-void-teal/40 transition-colors duration-300 group-hover:text-void-teal">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="relative font-mono text-sm text-white/55 tracking-wide transition-colors duration-300 group-hover:text-white/85">
                  {phrase}
                </span>
                <span
                  aria-hidden="true"
                  className="relative ml-auto -translate-x-1 font-mono text-xs text-void-teal opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                >
                  ◂
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
