import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import ProofStrip from '@/components/landing/ProofStrip'
import TileCarousel from '@/components/landing/TileCarousel'
import CriteriaBento from '@/components/landing/CriteriaBento'
import HowBento from '@/components/landing/HowBento'
import TuneDemo from '@/components/landing/TuneDemo'
import TrustSection from '@/components/landing/TrustSection'
import FinalCta from '@/components/landing/FinalCta'
import Footer from '@/components/landing/Footer'

/* ──────────────────────────────────────────────────────────
   One landing page, at every width.

   Structure cloned from liveblocks.io — measured at 1440/768/390 rather than
   inferred from a screenshot, with the evidence and the reduced token system in
   .clone/liveblocks/. What was taken is the design system: the true-black canvas,
   the 12-column/1200px spine, the 20px section intros against 8-column bodies,
   the 1px-gap bento, the 400/500-only type ladder, the measured easings, and the
   dim-the-siblings hover. What was not taken is anything Liveblocks owns — no
   screenshots, no wordmarks, no compliance badges, no body copy, and not their
   licensed Suisse Int'l (Geist Sans stands in, and the substitution is noted in
   tokens.md).

   Every string on this page is this project's own, from components/landing/content.ts.

   Section order matches the target's spine one-for-one:
     hero · proof · tiles · criteria · steps · demo · trust · close · footer

   The Atmosphere layer that used to sit behind all of this is gone: the target's
   canvas is flat #000 and its only ambient light is the one radial glow behind
   the closing call, which FinalCta now owns.
────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-mk-panel-sunken">
      <Nav />
      <main className="relative">
        <Hero />
        <ProofStrip />
        <TileCarousel />
        <CriteriaBento />
        <HowBento />
        <TuneDemo />
        <TrustSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
