import Link from 'next/link'
import { PROOF } from './content'
import { Container } from './mk'

/* ──────────────────────────────────────────────────────────
   Social-proof strip: a 12px caption over two rows of five marks.

   The target puts customer wordmarks here. A research project has none, and
   inventing some would be the one unforgivable thing on a page whose argument is
   that the ranking cannot be bought — so the slot keeps its layout and names the
   syllabus and levels the matching was actually built against.

   Marks are set as type rather than imported as logos: no third-party artwork
   ships, and the row still reads as a row of marks because the target's own are
   flat monochrome wordmarks at the same weight.

   The hover is the target's: the row dims to 0.3 and whatever is under the
   cursor stays at full strength.
────────────────────────────────────────────────────────── */

export default function ProofStrip() {
  return (
    <section aria-label="What this was built against" className="mt-mk-2xs">
      <Container>
        <p className="text-center text-mk-small text-mk-ink-4">{PROOF.caption}</p>

        <ul className="mk-lift mt-6 grid grid-cols-2 justify-items-center gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {PROOF.marks.map((mark) => (
            <li
              key={mark}
              className="text-[19px] font-medium tracking-[-0.01em] text-mk-ink-3 lg:text-[21px]"
            >
              {mark}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-center">
          <Link
            href={PROOF.link.href}
            className="group -my-2 inline-flex min-h-9 items-center gap-1.5 rounded-md py-2 text-mk-small font-medium text-mk-ink transition-colors duration-300 ease-mk-out hover:text-mk-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink"
          >
            {PROOF.link.label}
            <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 opacity-60">
              <path
                d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 ease-mk-out group-hover:translate-x-0.5"
              />
            </svg>
          </Link>
        </div>
      </Container>
    </section>
  )
}
