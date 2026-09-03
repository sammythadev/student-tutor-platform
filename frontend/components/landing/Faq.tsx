import { FAQ } from './content'

/* ──────────────────────────────────────────────────────────
   Four objections a real reader of this product has.

   Native <details>/<summary>: keyboard operable, announced correctly, open by
   default to a crawler, and it needs no JavaScript at all — which is why it is
   the right primitive here rather than a scripted accordion.

   The JSON-LD repeats the same strings from the same source, so the structured
   data cannot drift from what is on screen.
────────────────────────────────────────────────────────── */

export default function Faq() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section aria-labelledby="faq-title" className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8 lg:pb-28">
      <h2 id="faq-title" className="mk-h2 max-w-[20ch] text-mk-ink">
        The questions people actually ask.
      </h2>

      <div className="mt-10 max-w-[74ch]">
        {FAQ.map(item => (
          <details key={item.q} className="group border-b border-mk-hairline">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[15px] font-medium text-mk-ink transition-colors duration-150 hover:text-mk-ink-2 [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden
                className="mt-1 shrink-0 text-mk-ink-3 transition-transform duration-200 ease-out group-open:rotate-45"
              >
                {/* A plus that becomes a cross. Drawn, so it needs no icon set. */}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <p className="max-w-[68ch] pb-5 text-[14px] leading-[1.65] text-mk-ink-2">{item.a}</p>
          </details>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  )
}
