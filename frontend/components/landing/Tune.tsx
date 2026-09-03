import { TUNE } from './content'
import WeightSliders from './WeightSliders'

/* One interactive moment, framed. The sliders are the whole argument that the
   weighting is the reader's: nothing here needs a paragraph in front of it. */
export default function Tune() {
  return (
    <section
      id="fair"
      aria-labelledby="tune-title"
      className="relative mx-auto w-full max-w-6xl px-5 pb-24 md:px-8 lg:pb-32"
    >
      <p className="text-[13px] font-medium text-mk-accent">{TUNE.eyebrow}</p>
      <h2 id="tune-title" className="mk-h2 mt-4 max-w-[22ch] text-mk-ink">
        {TUNE.headline}
      </h2>
      <p className="mk-lead mt-5 max-w-[52ch]">{TUNE.body}</p>

      <div className="mt-12">
        <WeightSliders />
      </div>
    </section>
  )
}
