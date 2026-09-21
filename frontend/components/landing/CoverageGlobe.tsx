'use client'

import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import { useTheme } from 'next-themes'

/* ──────────────────────────────────────────────────────────
   The globe cell.

   The reference puts a dotted, slowly rotating globe behind its "global edge
   network" claim. cobe draws exactly that in about 5kB of WebGL, which is the
   right call over a Three.js scene for one decorative sphere — three and ogl are
   both already dependencies here and both would cost far more for this.

   The equivalent honest claim for this project is reach rather than latency, so
   the markers are Nigerian cities the fixtures cover. Coordinates are real; the
   marker sizes are relative weights, not counts.

   Retina is handled by sizing the backing store to devicePixelRatio and letting
   CSS scale it back down. It sways rather than spins — see BASE_PHI — and it stops
   entirely under prefers-reduced-motion, since a perpetually moving object is
   exactly what that setting is for.
────────────────────────────────────────────────────────── */

const MARKERS: { location: [number, number]; size: number }[] = [
  { location: [6.5244, 3.3792], size: 0.13 },   // Lagos
  { location: [9.0765, 7.3986], size: 0.11 },  // Abuja
  { location: [11.9964, 8.5167], size: 0.1 }, // Kano
  { location: [7.3775, 3.947], size: 0.09 },   // Ibadan
  { location: [6.4499, 7.5105], size: 0.08 },  // Enugu
  { location: [4.8156, 7.0498], size: 0.08 },  // Port Harcourt
  { location: [10.3158, 9.8442], size: 0.07 }, // Jos
]

export default function CoverageGlobe() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()
  const light = resolvedTheme === 'light'

  useEffect(() => {
    const el = canvas.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    /* It sways around West Africa rather than rotating freely. Every marker here
       is a Nigerian city, so a full rotation spends most of a minute showing the
       reader ocean and a face the claim does not cover. A bounded sway of ±0.22rad
       keeps Nigeria near the centre at all times and still reads as alive. */
    /* phi was measured, not guessed. cobe's shader puts the point at screen
       centre where cos(long - PI) = sin(phi), signed by cos(phi); solving that for
       Nigeria's ~7.5E gives 4.58, and the cluster lands centred on screen.
       The earlier 3.76 centres 54.5E — it only looked right while the resolution
       bug above was zooming the middle of the sphere into the canvas box, so it
       was a value tuned to cancel out a defect rather than to aim the globe. */
    const BASE_PHI = 4.58
    const SWAY = 0.22
    let t = 0
    let width = el.offsetWidth || 300
    /* One dpr for both halves of cobe's sizing contract. `width`/`height` only
       feed the shader's resolution uniform; the drawing buffer comes from the
       element's own offsetWidth times this ratio. The stock cobe example hard-codes
       `width * 2` alongside `devicePixelRatio: 2`, which is the same number twice
       and so only lines up on a retina screen. On a dpr-1 display it told the
       shader 524 for a 262px buffer, which drew the sphere at twice size and let
       the canvas box crop its middle out — the markers ended up jammed against the
       top edge and the dot map was cut off at the right. */
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2)

    const onResize = () => {
      width = el.offsetWidth || width
    }
    window.addEventListener('resize', onResize)

    const globe = createGlobe(el, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
      phi: BASE_PHI,
      theta: 0.18,
      /* Lit to be read, not to be atmospheric. The first pass used the target's
          own values, but the target's globe sits on #0e0e0e inside a lit card and
          this one sits on near-black at half the height, so the same numbers came
          out as a faint arc. Brightness and base carry the dot map; the glow gives
          the limb an edge so the sphere reads as a sphere. */
      /* Three passes to get here, and the lesson was that `dark` and the sway are
          one decision, not two. Flattening the light to rescue the night side made
          the base out-read the map, so the continents looked like holes; what
          actually fixed the void was pinning the sway so the terminator stops
          moving. With the lit face held, the map can stay bright. */
      dark: light ? 0.25 : 0.78,
      diffuse: light ? 0.9 : 0.58,
      mapSamples: 16000,
      mapBrightness: light ? 6 : 10,
      baseColor: light ? [0.88, 0.87, 0.87] : [0.3, 0.3, 0.33],
      markerColor: light ? [0.02, 0.45, 0.4] : [0.42, 0.94, 0.81], // --lb-marketing-color-green-400
      glowColor: light ? [0.75, 0.72, 0.78] : [0.19, 0.2, 0.23],
      markers: MARKERS,
      onRender: (state) => {
        if (!reduced) t += 0.0022
        state.phi = BASE_PHI + Math.sin(t) * SWAY
        state.width = width * dpr
        state.height = width * dpr
      },
    })

    /* cobe paints its first frame transparent; fading in avoids the flash. */
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '1'
    })

    return () => {
      cancelAnimationFrame(raf)
      globe.destroy()
      window.removeEventListener('resize', onResize)
    }
  }, [light])

  return (
    <canvas
      ref={canvas}
      aria-hidden
      /* Taller than the band it sits in and pinned to its top, so the cell's own
          overflow crops the sphere at the bottom edge the way the target's does.
          The ratio matters: at 330px only the top 59% showed, which put 7N right on
          the crop line and hid every marker. At 262px the band reaches past the
          equator and the Nigerian cluster sits mid-cell. */
      className="absolute left-1/2 top-0 aspect-square w-[230px] -translate-x-1/2 opacity-0 transition-opacity duration-700 ease-mk-out lg:w-[262px]"
      style={{ contain: 'layout paint' }}
    />
  )
}
