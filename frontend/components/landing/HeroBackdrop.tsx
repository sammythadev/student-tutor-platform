'use client'

import { useRef } from 'react'
import { useTheme } from 'next-themes'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils'
import Grainient from '@/components/reactbits/Grainient'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ──────────────────────────────────────────────────────────
   The hero's light field — hero only.

   One blurred <Grainient /> sits behind the hero and nothing else; the rest of
   the page keeps the flat canvas the rest of this build is measured against.
   Two decisions are deliberate:

   · No grain. Grainient's film grain is switched off — at this size it reads as
     noise behind the headline, not as texture, and it fights the type.
   · Scroll. The field drifts up and fades out as the hero leaves, scrubbed to
     scroll position like the rest of this page's ambient motion (Atmosphere
     used the same scrub). Under reduced motion it is simply static.

   Decorative only: aria-hidden, pointer-events-none, and it is dropped to a
   negative z-index inside an isolated stacking context so it can only ever sit
   under the hero's own content.
────────────────────────────────────────────────────────── */

/* ── The field's two configs.

   The shader is the same shader; what differs is what the lightMode remap does
   to a given input. It keeps hue, discards nearly all the value
   (`mix(white, hue*0.58 + col*0.18, coverage)`, coverage driven by chroma), so:

   · Dark takes greys, because the canvas underneath is black and the field only
     has to be *lighter* than it.
   · Light takes three pastels of the same lightness — a rose, a pale lilac and
     a periwinkle — because the first attempt reused the dark palette's greys and
     came out as an off-white that was measurable in the DOM and invisible to the
     eye. Keeping the three the same lightness also keeps the shader's own band
     boundary invisible: a near-white middle colour leaves a visible edge where
     the swirl passes through it. */
const FIELD = {
  light: {
    palette: { color1: '#dfa9c2', color2: '#cfc3e2', color3: '#a9b0d8' },
    /* 1.0, not the dark field's 1.5: contrast clips the pastels to a flat block
       long before it clips near-black. */
    contrast: 1.0,
    /* Above 1. The remap compresses the field's whole dynamic range into the top
       tenth of the white-to-ink scale (~0.86–1.0 of white), so a pale input keeps
       its hue but loses almost all of its travel — the pattern moved, and at
       mean 2/255 over five seconds nobody could see it. Oversaturating the input
       buys back the chroma that coverage is computed from, which is what makes
       the drift legible on white without darkening the wash. */
    saturation: 1.5,
    surface: 'opacity-80',
    dissolve: 'h-[50%]',
  },
  dark: {
    palette: { color1: '#8c8c8c', color2: '#000000', color3: '#3c3c3c' },
    contrast: 1.5,
    saturation: 1.0,
    surface: 'opacity-80',
    dissolve: 'h-[45%]',
  },
} as const

export default function HeroBackdrop() {
  const root = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const light = resolvedTheme === 'light'
  const field = light ? FIELD.light : FIELD.dark

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* Short scrub window: the field is gone before the product frame
           arrives, so it never competes with the frame for attention. */
        const tween = gsap.to('[data-hero-field]', {
          yPercent: -16,
          opacity: 0.12,
          ease: 'none',
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top',
            end: '+=880',
            scrub: true,
          },
        })

        return () => {
          tween.scrollTrigger?.kill()
          tween.kill()
        }
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[112vh] overflow-hidden"
    >
      {/* Oversized so the field's own edges are clipped off-frame. */}
      <div
        data-hero-field
        className={cn('absolute inset-x-[-12%] top-[-16%] h-[126%]', field.surface)}
      >
        <Grainient
          lightMode={light}
          color1={field.palette.color1}
          color2={field.palette.color2}
          color3={field.palette.color3}
          timeSpeed={0.25}
          colorBalance={0.0}
          warpStrength={1.0}
          warpFrequency={5.0}
          warpSpeed={2.0}
          warpAmplitude={50.0}
          blendAngle={0.0}
          blendSoftness={0.05}
          rotationAmount={500.0}
          noiseScale={2.0}
          grainAmount={0}
          grainScale={2.0}
          grainAnimated={false}
          contrast={field.contrast}
          gamma={1.0}
          saturation={field.saturation}
          centerX={0.0}
          centerY={0.0}
          zoom={0.9}
        />
      </div>

      {/* Dissolve the field into the flat canvas before the product frame, so the
          hero reads as a lit band rather than a pasted rectangle. The light
          field is tinted across more of its height, so it needs a longer ramp
          home. */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent to-mk-panel-sunken',
          field.dissolve,
        )}
      />
    </div>
  )
}
