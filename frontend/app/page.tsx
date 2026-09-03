import Atmosphere from '@/components/landing/Atmosphere'
import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import ExplodedDashboard from '@/components/landing/ExplodedDashboard'
import SubjectStrip from '@/components/landing/SubjectStrip'
import Showcase from '@/components/landing/Showcase'
import HowItWorks from '@/components/landing/HowItWorks'
import Tune from '@/components/landing/Tune'
import Faq from '@/components/landing/Faq'
import FinalCta from '@/components/landing/FinalCta'
import Footer from '@/components/landing/Footer'

/* ──────────────────────────────────────────────────────────
   One landing page, at every width.

   This used to be two files: a 1200-line desktop build and a 467-line phone
   build, switched by a media query in JavaScript after mount. Both shipped in
   the same bundle, phones painted the desktop hero and then swapped, and the
   duplicated copy had already drifted. Breakpoint work is now CSS and
   gsap.matchMedia(), so nothing is chosen at runtime and nothing ships twice.

   It also used to spend four of its seven sections explaining the matching
   engine: the greedy pass, the half-of-optimal bound, a 3D bipartite graph, and a
   pinned hero that took the shortlist apart criterion by criterion. That is a
   thesis, not a landing page. What opens the page now is the product assembling
   itself, and the one place the scoring is still handed over is the slider panel
   further down, where the reader can drive it.
────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="landing-shell relative min-h-dvh overflow-x-clip bg-mk-panel-sunken">
      <Atmosphere />
      <Nav />
      <main className="relative">
        <Hero />
        <ExplodedDashboard />
        <SubjectStrip />
        <Showcase />
        <HowItWorks />
        <Tune />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
