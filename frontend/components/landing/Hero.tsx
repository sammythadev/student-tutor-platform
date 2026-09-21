import Link from 'next/link'
import { CTA, HERO } from './content'
import { ButtonGhost, ButtonPrimary, Container } from './mk'
import ProductFrame from './ProductFrame'
import HeroBackdrop from './HeroBackdrop'
import Annotation from './Annotation'
import styles from './Hero.module.css'

/* ──────────────────────────────────────────────────────────
   Centred hero, measured proportions.

   The vertical rhythm is the target's, read off the DOM rather than eyeballed:
   105px of air under the 80px header, then pill → 34px → headline → 16px → lead
   → 40px → actions → 186px → the product frame. Headline and lead both cap at
   896px, which is nine of the twelve columns.

   The headline is weight 500 at 64px with -0.02em tracking. It looks bold
   because it is large and tightly tracked, not because it is heavy — the target
   ships no weight above 500 anywhere, and reaching for 700 here is the fastest
   way to make the whole page look like a different, louder site.
────────────────────────────────────────────────────────── */

/* The announcement pill: a hairline capsule with a 4px-inset circular arrow.
   Its only hover is the surface lifting to 8% white. */
function Announcement() {
  return (
    <Link
      href={CTA.secondary.href}
      className="group inline-flex items-center gap-2 rounded-full border border-mk-hairline-soft py-1 pl-3 pr-1 text-mk-small font-medium text-mk-ink transition-colors duration-300 ease-mk-out hover:bg-mk-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink lg:text-base"
    >
      <span className="rounded-full bg-mk-accent-soft px-2 py-0.5 text-mk-small text-mk-ink-2">New</span>
      <span>{HERO.eyebrow}</span>
      <span aria-hidden className="grid size-7 place-items-center rounded-full bg-mk-accent-soft">
        <svg viewBox="0 0 16 16" className="size-3.5">
          <path
            d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-300 ease-mk-out group-hover:translate-x-0.5"
          />
        </svg>
      </span>
    </Link>
  )
}

/* Hand-drawn pointer at the product frame. The target sets its label in a script
   face; that one is licensed, so the label is set in Caveat (the open stand-in
   layout.tsx loads as --font-script) and Annotation draws the arrow itself. */

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate pt-[105px] lg:pt-[185px]">
      {/* Hero-only light field. `isolate` keeps its negative z-index contained to
          this section so it can never paint over the sections below. */}
      <HeroBackdrop />

      <Container>
        <div className="relative flex flex-col items-center text-center">
          <Announcement />

          <h1 id="hero-title" className={`${styles.headline} mk-display mt-6 max-w-[896px] text-mk-ink lg:mt-[34px]`}>
            {HERO.headline}
          </h1>

          <p className={`${styles.lead} mk-lead mt-4 max-w-[896px] text-mk-ink-2`}>{HERO.lead}</p>

          <div className={`${styles.actions} mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row lg:mt-10`}>
            <ButtonPrimary href={CTA.primary.href} className="w-full sm:w-auto">
              {CTA.primary.label}
            </ButtonPrimary>
            <ButtonGhost href={CTA.secondary.href}>{CTA.secondary.label}</ButtonGhost>
          </div>

          <Annotation
            direction="down-left"
            className="absolute -bottom-24 right-6 hidden w-[210px] xl:block"
          >
            {HERO.annotation}
          </Annotation>
        </div>
      </Container>

      <div className="mt-16 lg:mt-[186px]">
        <ProductFrame />
      </div>
    </section>
  )
}
