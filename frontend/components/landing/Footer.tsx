import Link from 'next/link'
import { BRAND, FOOTER, FOOTER_NOTE } from './content'

/* Every href here resolves to a route that exists. The previous footer linked
   /privacy and /terms, neither of which is a page in this app. */
export default function Footer() {
  return (
    <footer className="border-t border-mk-hairline">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="flex flex-col justify-center gap-[3px]">
                <span className="block h-[3px] w-[18px] rounded-full bg-mk-accent" />
                <span className="block h-[3px] w-[11px] rounded-full bg-mk-ink-3" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-mk-ink">{BRAND}</span>
            </div>
            <p className="mt-3.5 text-[13px] leading-relaxed text-mk-ink-2">{FOOTER_NOTE}</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:gap-16">
            {FOOTER.map(group => (
              <div key={group.heading}>
                <p className="text-[12px] font-medium text-mk-ink-3">{group.heading}</p>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {group.links.map(link => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-mk-ink-2 transition-colors duration-150 hover:text-mk-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-mk-hairline-soft pt-6">
          <p className="text-[12px] text-mk-ink-3">
            © {new Date().getFullYear()} {BRAND}. A final-year research project.
          </p>
        </div>
      </div>
    </footer>
  )
}
