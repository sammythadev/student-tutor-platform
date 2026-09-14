import { HOW_BENEFITS, HOW_BLOCK_TITLE, HOW_INTRO, STATEMENT, STEPS } from './content'
import { HOW_ICONS, Icon } from './icons'
import { Body, Intro, Section } from './mk'

/* ──────────────────────────────────────────────────────────
   The steps bento: one wide row, then a 2x2, then a dim statement.

   Three cell shapes in one grid is what gives this section its rhythm on the
   target, and flattening it into a uniform row of cards is the exact drift this
   build is trying to avoid. So: the wide row pairs a 32px heading against a
   stacked list; the four benefit cells match the criteria bento's shape; and the
   last row spans the full width to carry a 48px line in the *subtlest* ink.

   That last one is worth stating plainly because it looks like a mistake in
   isolation: the largest type in the section is also the dimmest. It reads as
   texture closing the block rather than as a heading opening one.
────────────────────────────────────────────────────────── */

export default function HowBento() {
  return (
    <Section id="how" rhythm="2xl" labelledBy="how-title">
      <Intro id="how-title" heading={HOW_INTRO.heading}>
        <span dangerouslySetInnerHTML={{ __html: HOW_INTRO.lead }} />
      </Intro>

      <Body className="mt-mk-lg">
        <div className="mk-bento grid-cols-1 sm:grid-cols-2">
          {/* Wide row. On the target this row carries a faint radial lift, which
              is the only glow anywhere inside a bento. */}
          <div className="relative sm:col-span-2">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: 'radial-gradient(70% 120% at 18% 0%, rgb(253 252 252 / 0.05) 0%, transparent 70%)' }}
            />
            <div className="relative grid gap-8 sm:grid-cols-2 sm:gap-mk-gutter">
              <h3 className="mk-h3 max-w-[16ch] text-mk-ink">{HOW_BLOCK_TITLE}</h3>

              <ol className="mk-lift flex flex-col gap-4">
                {STEPS.map((step) => (
                  <li key={step.title} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-mk-track text-mk-small text-mk-ink-3"
                    >
                      {step.ordinal.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-mk-body font-medium text-mk-ink">{step.title}</p>
                      <p className="mk-small mt-0.5 max-w-[46ch]">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {HOW_BENEFITS.map((benefit, i) => (
            <div key={benefit.title} className="sm:min-h-[170px]">
              <Icon name={HOW_ICONS[i]} className="mb-4 text-mk-ink-2" />
              <h3 className="text-mk-body font-normal text-mk-ink">{benefit.title}</h3>
              <p className="mk-body mt-1 max-w-[40ch]">{benefit.body}</p>
            </div>
          ))}

          <div className="sm:col-span-2">
            <p className="mk-statement max-w-[24ch]">{STATEMENT}</p>
          </div>
        </div>
      </Body>
    </Section>
  )
}
