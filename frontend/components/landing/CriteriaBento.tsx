import { CRITERIA, CRITERIA_CELLS, CRITERIA_INTRO } from './content'
import { CRITERIA_ICONS, Icon } from './icons'
import SpotlightGrid from './SpotlightGrid'
import CoverageGlobe from './CoverageGlobe'
import { Body, Intro, Section } from './mk'

/* ──────────────────────────────────────────────────────────
   The criteria bento: two tall cells, then four short ones.

   The grid is one element with `gap: 1px` over a divider-coloured fill (the
   .mk-bento utility), so every hairline is the parent showing through and no cell
   owns a border. That is how the target does it, and it is why its cells line up
   exactly — a per-cell border drifts a pixel per row and the eye catches it.

   Cell headings are 16px/400 white with a 16px/400 grey body underneath. Not
   bold, not larger: the size relationship between a cell heading and its body is
   almost flat here, and the hierarchy comes from colour alone.
────────────────────────────────────────────────────────── */

/* Weight as a bar rather than a percentage badge. The target uses no badges
   anywhere, and the four weights are more legible as relative lengths. */
function WeightBar({ weight }: { weight: number }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="mk-bar w-16" style={{ '--fill': weight } as React.CSSProperties}>
        <i />
      </div>
      <span className="mk-num text-mk-small text-mk-ink-4">{weight.toFixed(2)}</span>
    </div>
  )
}

export default function CriteriaBento() {
  return (
    <Section id="fair" rhythm="2xl" labelledBy="criteria-title">
      <Intro id="criteria-title" heading={CRITERIA_INTRO.heading}>
        <span dangerouslySetInnerHTML={{ __html: CRITERIA_INTRO.lead }} />
      </Intro>

      <Body className="mt-mk-lg">
        <SpotlightGrid className="mk-bento grid-cols-1 sm:grid-cols-2">
          {/* Two tall cells. Content sits at the top; the space below is the
              target's — it does not fill its tall cells either. */}
          {CRITERIA_CELLS.map((cell, i) => (
            <div key={cell.title} className="relative flex flex-col overflow-hidden sm:h-[300px] lg:h-[395px]">
              <h3 className="relative z-10 text-mk-body font-normal text-mk-ink">{cell.title}</h3>
              <p className="relative z-10 mk-body mt-1 max-w-[42ch]">{cell.body}</p>

              {/* The reference fills its tall cells with a visual below the copy.
                  First cell: the reach the fixtures cover, drawn with cobe.
                  Second: the weighted sum, as the four bars that make it. */}
              {i === 0 ? (
                <div className="pointer-events-none relative mt-auto h-[150px] sm:h-[132px] lg:h-[196px]">
                  <CoverageGlobe />
                </div>
              ) : (
                <div className="mt-auto flex flex-col gap-3 pt-8">
                  {CRITERIA.map((crit) => (
                    <div key={crit.key} className="flex items-center gap-3">
                      <span className="w-[13ch] shrink-0 text-mk-small text-mk-ink-3">{crit.label}</span>
                      <span className="mk-bar flex-1">
                        <i style={{ ['--fill' as string]: crit.weight * 2.4 }} aria-hidden />
                      </span>
                      <span className="mk-num w-[3ch] text-right text-mk-small text-mk-ink-4">
                        {crit.weight.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* The four weighted criteria, in the spec's order. */}
          {CRITERIA.map((criterion, i) => (
            <div key={criterion.key} className="sm:min-h-[170px]">
              <Icon name={CRITERIA_ICONS[i]} className="mb-4 text-mk-ink-2" />
              <h3 className="text-mk-body font-normal text-mk-ink">{criterion.label}</h3>
              <p className="mk-body mt-1 max-w-[38ch]">{criterion.detail}</p>
              <WeightBar weight={criterion.weight} />
            </div>
          ))}
        </SpotlightGrid>
      </Body>
    </Section>
  )
}
