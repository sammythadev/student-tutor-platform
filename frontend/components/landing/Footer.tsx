import Link from 'next/link'
import { BRAND, FOOTER, FOOTER_NOTE } from './content'
import { Container } from './mk'

/* ──────────────────────────────────────────────────────────
   Footer: column headings in the muted ink, links a step brighter.

   The target's footer is a wide multi-column link nav — six columns of it,
   because it has six product areas to list. This one has two, so it keeps the
   same grammar (12px/500 heading, 14px links, generous column gap) at the width
   the content actually needs rather than padding out to six columns of filler.

   Every href here is a route that exists. The earlier version of this footer
   linked /privacy and /terms, neither of which the app serves.
────────────────────────────────────────────────────────── */

export default function Footer() {
  return (
    <footer className="border-t border-mk-hairline-soft pb-mk-sm pt-mk-md">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))] lg:gap-mk-gutter">
          <div className="lg:pr-8">
            <p className="text-[17px] font-medium tracking-[-0.01em] text-mk-ink">{BRAND}</p>
            <p className="mk-small mt-2 max-w-[34ch]">{FOOTER_NOTE}</p>
          </div>

          {FOOTER.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="text-mk-small font-medium text-mk-ink">{group.heading}</p>
              <ul className="mk-lift mt-4 flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={`${group.heading}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-8 items-center text-mk-small text-mk-ink-3 transition-colors duration-300 ease-mk-out hover:text-mk-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar. The target closes its footer with one of these under a
            divider -- wordmark line, a status indicator, then the fine print --
            and without it the whole footer reads as unfinished.

            One deliberate difference from the target here: its footer runs 976px
            because it lists a six-column sitemap of products, solutions and use
            cases. This app has five columns of routes that actually exist, so the
            footer lands shorter. Padding it out would mean inventing links. */}
        <div className="mt-mk-md flex flex-col gap-4 border-t border-mk-hairline-soft pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="mk-small text-mk-ink-4">
            A final-year research project. No accounts are sold and no data is shared.
          </p>
          <p className="inline-flex items-center gap-2 text-mk-small text-mk-ink-3">
            <span aria-hidden className="size-1.5 rounded-full bg-emerald-400" />
            Matching engine operational
          </p>
        </div>
      </Container>
    </footer>
  )
}
