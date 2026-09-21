import { CLOSE, CTA } from './content'
import { ButtonGhost, ButtonPrimary, Container } from './mk'

/* ──────────────────────────────────────────────────────────
   The closing call.

   196px of padding above and below — the target's largest single spacing token,
   stepping to 160 at tablet and 128 on a phone. That padding is the whole design
   of this section: a 52px centred heading, two actions, and nothing else in an
   unusual amount of air.

   The glow is one radial gradient behind the heading, clipped by the section's
   overflow. The target pairs it with an inset white shadow on a full-bleed
   element; both are measured, both are here.
────────────────────────────────────────────────────────── */

export default function FinalCta() {
  return (
    <section
      aria-labelledby="close-title"
      className="relative isolate flex flex-col items-center overflow-hidden py-mk-lg lg:py-mk-xl"
    >
      {/* The arc.

          This is the one piece of the closing section that carries it, and it is
          not a radial gradient behind the heading: it is an enormous ellipse,
          wider than the viewport, whose crest rises into the section from below.
          Its fill runs near-white at the crest to black within a few hundred
          pixels, and its edge carries the inset white glow measured on the
          target (inset 0 0 86.4px rgb(255 255 255 / .6)). The heading then sits
          in the dark below the crest.

          Sized in vw so the curvature stays the same shape at every width — a
          fixed-width ellipse flattens out on a phone and bulges on a wide
          monitor. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden">
        <div
          className="absolute left-1/2 top-[86px] h-[1400px] w-[240vw] -translate-x-1/2 rounded-[50%]"
          style={{
            background:
              'var(--mk-cta-arc)',
            boxShadow: 'var(--mk-cta-shadow)',
          }}
        />
      </div>

      <Container>
        <h2 id="close-title" className="mx-auto max-w-[896px] text-center mk-h2 text-mk-ink">
          {CLOSE.headline}
        </h2>

        <p className="mk-lead mx-auto mt-5 max-w-[52ch] text-center">{CLOSE.body}</p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:mt-10">
          <ButtonPrimary href={CTA.primary.href} className="w-full sm:w-auto">
            {CTA.primary.label}
          </ButtonPrimary>
          <ButtonGhost href={CTA.secondary.href}>{CTA.secondary.label}</ButtonGhost>
        </div>
      </Container>
    </section>
  )
}
