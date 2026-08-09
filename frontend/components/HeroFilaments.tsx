'use client'

import Waves from '@/components/reactbits/Waves'

/**
 * HeroFilaments — the bespoke ambient layer for the dashboard hero.
 *
 * Two stacked React Bits <Waves> fields (canvas line-work) woven at different
 * gaps and speeds for parallax depth — a slow "engraved current" reminiscent of
 * the guilloché line-work on certificates and banknotes, tuned to the Scholarly
 * Ivy palette. Decorative only, never blocks interaction, and fully static under
 * reduced motion (the hero already carries a dot-grid + grain for that case).
 */

interface WaveLayer {
  lineColor: string
  xGap: number
  yGap: number
  waveSpeedX: number
  waveSpeedY: number
  waveAmpX: number
  waveAmpY: number
}

// Per tone: a denser base line-field + a sparser highlight for depth.
const LAYERS: Record<'primary' | 'accent', [WaveLayer, WaveLayer]> = {
  // Pine hero → warm brass engraving threaded with a soft mint highlight.
  primary: [
    { lineColor: 'rgba(201,162,75,0.30)', xGap: 24, yGap: 34, waveSpeedX: 0.009, waveSpeedY: 0.0035, waveAmpX: 40, waveAmpY: 20 },
    { lineColor: 'rgba(150,210,180,0.16)', xGap: 46, yGap: 40, waveSpeedX: 0.006, waveSpeedY: 0.0025, waveAmpX: 30, waveAmpY: 14 },
  ],
  // Brass hero → ivory engraving threaded with a brighter brass highlight.
  accent: [
    { lineColor: 'rgba(244,240,232,0.22)', xGap: 24, yGap: 34, waveSpeedX: 0.009, waveSpeedY: 0.0035, waveAmpX: 40, waveAmpY: 20 },
    { lineColor: 'rgba(230,200,126,0.20)', xGap: 46, yGap: 40, waveSpeedX: 0.006, waveSpeedY: 0.0025, waveAmpX: 30, waveAmpY: 14 },
  ],
}

export function HeroFilaments({ tone, reduce }: { tone: 'primary' | 'accent'; reduce: boolean }) {
  if (reduce) return null
  const [base, highlight] = LAYERS[tone]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Waves {...base} backgroundColor="transparent" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)' }} />
      <Waves {...highlight} backgroundColor="transparent" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)' }} />
    </div>
  )
}
