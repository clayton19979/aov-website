import Link from 'next/link'
import { LandingHero } from '@/components/landing/LandingHero'
import { recognitionBrief } from '@/data/recognition'

export default function LandingPage() {
  return (
    <main className="bg-void-black">
      <LandingHero />
      <RecognitionBrief />
    </main>
  )
}

function RecognitionBrief() {
  return (
    <section
      aria-labelledby="recognition-brief-title"
      className="relative border-t border-void-teal/10 px-6 py-14 sm:py-16"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
        <div className="flex flex-col items-start">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-void-teal/45">
            {recognitionBrief.eyebrow}
          </p>
          <h2
            id="recognition-brief-title"
            className="max-w-xl font-mono text-2xl uppercase tracking-widest text-white/85 sm:text-3xl"
          >
            {recognitionBrief.title}
          </h2>
          <p className="mt-5 max-w-xl font-mono text-sm leading-loose tracking-wide text-white/40">
            {recognitionBrief.intro}
          </p>
          <blockquote className="mt-8 border-l border-void-teal/40 pl-5">
            <p className="font-mono text-xs uppercase leading-loose tracking-widest text-void-teal/70">
              &ldquo;{recognitionBrief.publicSignal}&rdquo;
            </p>
          </blockquote>
          <Link
            href="/login"
            className="mt-9 inline-flex border border-void-teal/25 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-void-teal/70 transition-colors duration-300 hover:border-void-teal/60 hover:text-void-teal"
          >
            Member threshold
          </Link>
        </div>

        <div className="border-y border-void-teal/10">
          {recognitionBrief.signals.map(signal => (
            <article
              key={signal.step}
              className="group grid gap-4 border-b border-void-teal/10 py-6 last:border-b-0 sm:grid-cols-[4rem_1fr]"
            >
              <span className="font-mono text-xs tracking-widest text-void-teal/35 transition-colors duration-300 group-hover:text-void-teal/75">
                {signal.step}
              </span>
              <div>
                <h3 className="font-mono text-sm uppercase tracking-widest text-white/75">
                  {signal.title}
                </h3>
                <p className="mt-3 font-mono text-xs leading-loose tracking-wide text-white/40">
                  {signal.body}
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/20">
                  {signal.measure}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
