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
        <SectionTitle glyph="⬡" title="DOCTRINE" subtitle="Canonical texts of the order" />

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
            <ol className="flex flex-col gap-2">
              {doctrine.coreBeliefs.axioms.map((axiom, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="font-mono text-xs text-void-teal/30 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-sm text-white/70 tracking-wide">
                    {axiom}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="border-l-2 border-void-teal/30 pl-6">
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
                <blockquote className="border-l-2 border-void-teal/30 pl-6">
                  <p className="font-mono text-sm text-white/50 leading-loose tracking-wide italic">
                    "{fragment.text}"
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
          <ul className="flex flex-col gap-3">
            {doctrine.commonPhrases.map((phrase, i) => (
              <li key={i} className="flex items-center gap-4">
                <span className="text-void-teal/30 text-xs">◈</span>
                <span className="font-mono text-sm text-white/60 tracking-wide">{phrase}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
