import Link from 'next/link'
import { CTA, HERO } from './content'

/* ──────────────────────────────────────────────────────────
   Hero copy.

   This replaced a pinned scroll-scrub that took the shortlist apart criterion by
   criterion. It was accurate and it was the wrong thing to open with: a visitor
   who has not agreed to care about the scoring yet was being handed the scoring.
   The product assembling itself, immediately below, is the better first move.

   Server-rendered, no client boundary: nothing here needs one.
────────────────────────────────────────────────────────── */

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 pb-6 pt-16 md:px-8 lg:pb-2 lg:pt-28">
        <p className="text-[13px] font-medium text-mk-ink-3">{HERO.eyebrow}</p>

        <h1 id="hero-title" className="mk-display mt-4 max-w-[19ch] text-mk-ink">
          Every tutor, ranked.
          <br />
          <span className="text-mk-ink-3">Every rank, explained.</span>
        </h1>

        <p className="mk-lead mt-5 max-w-[58ch]">{HERO.lead}</p>

        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Link
            href={CTA.primary.href}
            className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-mk-ink px-6 text-[15px] font-medium text-mk-panel transition-[background-color,transform] duration-150 ease-out hover:bg-mk-ink-2 active:scale-[0.97] sm:h-11 sm:w-auto"
          >
            {CTA.primary.label}
          </Link>
          <Link
            href={CTA.secondary.href}
            className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-mk-ink-2 underline decoration-mk-hairline underline-offset-4 transition-colors duration-150 hover:text-mk-ink hover:decoration-current"
          >
            {CTA.secondary.label}
            <span aria-hidden className="transition-transform duration-200 ease-out group-hover:translate-x-0.5">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
