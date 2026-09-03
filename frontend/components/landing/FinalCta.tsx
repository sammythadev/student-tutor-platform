import Link from 'next/link'
import { CLOSE, CTA } from './content'

/* The same single action as the hero, after the argument that earns it. Two
   equally weighted asks cut the response to both, so the second route out is a
   text link rather than a matching button. */
export default function FinalCta() {
  return (
    <section aria-labelledby="close-title" className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8 lg:pb-28">
      <div className="mk-panel-glow relative px-6 py-14 sm:px-12 lg:px-16 lg:py-20">
        <h2 id="close-title" className="mk-h2 max-w-[24ch] text-mk-ink">
          {CLOSE.headline}
        </h2>
        <p className="mk-lead mt-5 max-w-[52ch]">{CLOSE.body}</p>

        <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Link
            href={CTA.primary.href}
            className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-mk-ink px-7 text-[15px] font-medium text-mk-panel transition-[background-color,transform] duration-150 ease-out hover:bg-mk-ink-2 active:scale-[0.98] sm:w-auto"
          >
            {CTA.primary.label}
          </Link>
          <Link
            href={CTA.secondary.href}
            className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-mk-ink-2 underline decoration-mk-hairline underline-offset-4 transition-colors duration-150 hover:text-mk-ink hover:decoration-current"
          >
            {CTA.secondary.label}
            <span aria-hidden className="transition-transform duration-200 ease-out group-hover:translate-x-0.5">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
