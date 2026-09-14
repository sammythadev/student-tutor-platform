import QuoteRotator from './QuoteRotator'
import { Icon, TRUST_ICONS } from './icons'
import SpotlightGrid from './SpotlightGrid'
import { TRUST_CELLS, TRUST_INTRO, TRUST_STAT, TRUST_TALL } from './content'
import { Body, Intro, Section } from './mk'

/* ──────────────────────────────────────────────────────────
   The trust section: a quote, four cells, a stat.

   The target puts a customer testimonial here with an avatar and a company. This
   project has no customers, so the same slot carries the quotable things it does
   have — see QuoteRotator, which owns that slot. Layout is unchanged: a 24px
   quote at 672px, then the attribution row, then the four-cell grid, then the
   stat and its label.
────────────────────────────────────────────────────────── */

export default function TrustSection() {
  return (
    <Section rhythm="2xl" labelledBy="trust-title">
      <Intro id="trust-title" heading={TRUST_INTRO.heading}>
        <span dangerouslySetInnerHTML={{ __html: TRUST_INTRO.lead }} />
      </Intro>

      <Body className="mt-mk-sm">
        <QuoteRotator />

        <SpotlightGrid className="mk-bento mt-mk-sm grid-cols-1 sm:grid-cols-2">
          {/* Two tall cells first, matching the 395px opening row the target uses
              in this same slot. */}
          {TRUST_TALL.map((cell) => (
            <div key={cell.title} className="flex flex-col sm:min-h-[280px] lg:min-h-[340px]">
              <h3 className="text-mk-body font-normal text-mk-ink">{cell.title}</h3>
              <p className="mk-body mt-1 max-w-[42ch]">{cell.body}</p>
              <p className="mt-auto pt-6 font-mono text-mk-small text-mk-ink-4">{cell.note}</p>
            </div>
          ))}

          {TRUST_CELLS.map((cell, i) => (
            <div key={cell.title} className="sm:min-h-[170px]">
              <Icon name={TRUST_ICONS[i]} className="mb-4 text-mk-ink-2" />
              <h3 className="text-mk-body font-normal text-mk-ink">{cell.title}</h3>
              <p className="mk-body mt-1 max-w-[40ch]">{cell.body}</p>
            </div>
          ))}

          {/* The stat row, spanning both columns the way the target's uptime and
              compliance badges do. */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 sm:col-span-2">
            <p className="flex items-baseline gap-2">
              <span className="mk-num text-mk-h3 font-medium text-mk-ink">{TRUST_STAT.value}</span>
              <span className="mk-small">{TRUST_STAT.label}</span>
            </p>
            <p className="mk-small max-w-[46ch]">
              Checked on every run against a min-cost max-flow optimum, plus
              first-come and deferred-acceptance baselines.
            </p>
          </div>
        </SpotlightGrid>
      </Body>
    </Section>
  )
}
