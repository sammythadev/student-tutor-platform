'use client'

import Waves from '@/components/reactbits/Waves'

/**
 * HeroFilaments — the ambient wave layer for the dashboard hero.
 *
 * Two stacked React Bits <Waves> fields (canvas line-work) tuned to the React
 * Bits demo: a dense base line-field flowing on perlin noise with live cursor
 * spring interaction (move the mouse and the lines bend toward it), plus a
 * sparser highlight woven behind it for parallax depth. Colours follow the
 * Scholarly Ivy palette so it reads on the always-dark hero band. Decorative
 * only, never blocks interaction, and fully static under reduced motion (the
 * hero already carries a dot-grid + grain for that case).
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

// Per tone: a dense React-Bits-style base field + a sparser highlight for depth.
// Base gaps/speed/amp track the React Bits defaults (xGap 10, yGap 32,
// waveSpeedX 0.0125, waveAmpX 32) so it flows like the demo, not an engraving.
const LAYERS: Record<'primary' | 'accent', [WaveLayer, WaveLayer]> = {
  // Pine hero → warm brass line-field threaded with a soft mint highlight.
  primary: [
    { lineColor: 'rgba(201,162,75,0.30)', xGap: 12, yGap: 32, waveSpeedX: 0.0125, waveSpeedY: 0.005, waveAmpX: 32, waveAmpY: 16 },
    { lineColor: 'rgba(150,210,180,0.14)', xGap: 30, yGap: 38, waveSpeedX: 0.008, waveSpeedY: 0.0035, waveAmpX: 26, waveAmpY: 13 },
  ],
  // Brass hero → ivory line-field threaded with a brighter brass highlight.
  accent: [
    { lineColor: 'rgba(244,240,232,0.22)', xGap: 12, yGap: 32, waveSpeedX: 0.0125, waveSpeedY: 0.005, waveAmpX: 32, waveAmpY: 16 },
    { lineColor: 'rgba(230,200,126,0.18)', xGap: 30, yGap: 38, waveSpeedX: 0.008, waveSpeedY: 0.0035, waveAmpX: 26, waveAmpY: 13 },
  ],
}

export function HeroFilaments({ tone, reduce }: { tone: 'primary' | 'accent'; reduce: boolean }) {
  if (reduce) return null
  const [base, highlight] = LAYERS[tone]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Waves {...highlight} backgroundColor="transparent" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)' }} />
      <Waves {...base} backgroundColor="transparent" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }} />
    </div>
  )
}
